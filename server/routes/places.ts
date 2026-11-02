import { Router } from "express";
import crypto from "crypto";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Helper to calculate distance in meters (Haversine formula)
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Map category to OpenStreetMap amenity/shop tags
function getOsmTag(category: string): { key: string; val: string } {
  const map: Record<string, { key: string; val: string }> = {
    grocery: { key: "shop", val: "supermarket" },
    supermarket: { key: "shop", val: "supermarket" },
    pharmacy: { key: "amenity", val: "pharmacy" },
    hospital: { key: "amenity", val: "hospital" },
    restaurant: { key: "amenity", val: "restaurant" },
    cafe: { key: "amenity", val: "cafe" },
    barbershop: { key: "shop", val: "hairdresser" },
    salon: { key: "shop", val: "beauty" },
    stationery: { key: "shop", val: "stationery" },
    repair: { key: "shop", val: "doityourself" },
    bank: { key: "amenity", val: "bank" },
    atm: { key: "amenity", val: "atm" },
  };

  const lower = category.toLowerCase();
  for (const k of Object.keys(map)) {
    if (lower.includes(k)) return map[k];
  }
  return { key: "amenity", val: "restaurant" };
}

// Live Nearby Places Search (Rule 12 - Real Places Provider)
router.get("/:familyId/search", authenticate, requireFamilyMember, async (req: AuthenticatedRequest, res) => {
  const { latitude, longitude, radius = 2500, category = "grocery", query } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude coordinates are required for place search." });
  }

  const lat = parseFloat(latitude as string);
  const lon = parseFloat(longitude as string);
  const rad = Math.min(Math.max(parseInt(radius as string, 10) || 2500, 500), 10000);
  const cat = (category as string).toLowerCase();

  const queryHash = crypto
    .createHash("sha256")
    .update(`${lat.toFixed(3)}_${lon.toFixed(3)}_${rad}_${cat}_${query || ""}`)
    .digest("hex");

  // Check cache
  const cached = db.prepare(`
    SELECT response_json FROM places_cache
    WHERE query_hash = ? AND datetime(expires_at) > datetime('now')
  `).get(queryHash) as any;

  if (cached) {
    try {
      return res.json({ places: JSON.parse(cached.response_json), source: "cache" });
    } catch {
      // cache corrupted, continue to fetch
    }
  }

  try {
    const { key, val } = getOsmTag(cat);
    // Overpass API query for real places
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["${key}"="${val}"](around:${rad},${lat},${lon});
        way["${key}"="${val}"](around:${rad},${lat},${lon});
      );
      out center 25;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const osmRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "HomeSyncHousehold/1.0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "data=" + encodeURIComponent(overpassQuery),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!osmRes.ok) {
      throw new Error(`Place provider responded with status ${osmRes.status}`);
    }

    const osmData = await osmRes.json();
    const elements = osmData.elements || [];

    const places = elements
      .map((el: any) => {
        const placeLat = el.lat || el.center?.lat;
        const placeLon = el.lon || el.center?.lon;
        const tags = el.tags || {};
        const name = tags.name || tags["brand"] || `${tags.shop || tags.amenity || cat}`;
        const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]]
          .filter(Boolean)
          .join(" ") || tags["addr:full"] || null;

        const distanceM = (placeLat && placeLon) ? calculateDistanceMeters(lat, lon, placeLat, placeLon) : null;

        return {
          id: el.id,
          name: name,
          category: cat,
          latitude: placeLat,
          longitude: placeLon,
          address: address,
          distance_meters: distanceM,
          phone: tags.phone || tags["contact:phone"] || null,
          website: tags.website || tags["contact:website"] || null,
          opening_hours: tags.opening_hours || null,
          wheelchair: tags.wheelchair || null,
        };
      })
      .filter((p: any) => p.name && p.latitude && p.longitude)
      .sort((a: any, b: any) => (a.distance_meters || 0) - (b.distance_meters || 0));

    // Cache results for 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO places_cache (query_hash, latitude, longitude, radius_meters, category, response_json, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(query_hash) DO UPDATE SET
        response_json = excluded.response_json,
        expires_at = excluded.expires_at
    `).run(queryHash, lat, lon, rad, cat, JSON.stringify(places), expiresAt);

    res.json({ places, source: "live" });
  } catch (err: any) {
    console.error("Place provider search error:", err.message);
    // Return honest empty state with status
    res.json({
      places: [],
      warning: "Nearby place search provider is currently unavailable: " + err.message,
    });
  }
});

// Saved Household Locations (Home, College, Office, Hospital)
router.get("/:familyId/saved", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const locations = db.prepare(`
    SELECT * FROM saved_locations WHERE family_id = ? ORDER BY created_at ASC
  `).all(familyId);
  res.json({ locations });
});

// Create saved location
router.post("/:familyId/saved", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { name, category = "General", address, latitude, longitude, notes } = req.body;

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Name, latitude, and longitude are required." });
  }

  const insert = db.prepare(`
    INSERT INTO saved_locations (family_id, owner_user_id, name, category, address, latitude, longitude, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    familyId,
    req.user!.id,
    name.trim(),
    category,
    address || null,
    parseFloat(latitude),
    parseFloat(longitude),
    notes || null
  );

  const loc = db.prepare("SELECT * FROM saved_locations WHERE id = ?").get(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "SAVED_LOCATION_ADDED", "saved_locations", Number(result.lastInsertRowid), { name });

  res.status(201).json({ location: loc });
});

// Delete saved location
router.delete("/:familyId/saved/:id", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const id = parseInt(req.params.id, 10);

  db.prepare("DELETE FROM saved_locations WHERE id = ? AND family_id = ?").run(id, familyId);
  res.json({ message: "Saved location removed." });
});

export default router;
