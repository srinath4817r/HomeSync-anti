import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  Search,
  Navigation as NavIcon,
  Compass,
  Building,
  Shield,
  Layers,
  Clock,
  Radio,
  Trash2,
} from "lucide-react";
import { api } from "../api/client";
import { Family, NearbyPlace, LocationSnapshot, SavedLocation } from "../types";

interface MapProps {
  family: Family;
}

export const MapView: React.FC<MapProps> = ({ family }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [memberLocations, setMemberLocations] = useState<LocationSnapshot[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [category, setCategory] = useState("grocery");
  const [radius, setRadius] = useState(2500);
  const [loading, setLoading] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [precision, setPrecision] = useState<"approximate" | "precise">("approximate");

  // Center on home location if set, else default coordinates
  const defaultLat = family.home_latitude || 37.7749;
  const defaultLng = family.home_longitude || -122.4194;

  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([currentCenter.lat, currentCenter.lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Fetch sharing settings
  useEffect(() => {
    api.getLocationSettings(family.id).then((res) => {
      if (res.settings) {
        setSharingEnabled(Boolean(res.settings.enabled));
        setPrecision(res.settings.precision || "approximate");
      }
    });

    api.getSavedLocations(family.id).then((res) => {
      setSavedLocations(res.locations || []);
    });

    api.getLatestLocations(family.id).then((res) => {
      setMemberLocations(res.locations || []);
    });
  }, [family.id]);

  // Search places when category, radius or center changes
  const searchPlaces = async () => {
    try {
      setLoading(true);
      const res = await api.searchNearbyPlaces(
        family.id,
        currentCenter.lat,
        currentCenter.lng,
        radius,
        category
      );
      setPlaces(res.places || []);
    } catch (err: any) {
      console.warn("Place search failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPlaces();
  }, [family.id, category, radius, currentCenter.lat, currentCenter.lng]);

  // Update map markers
  useEffect(() => {
    if (!markersLayerRef.current || !leafletMapRef.current) return;
    markersLayerRef.current.clearLayers();

    // 1. Center marker (home / user focus)
    const homeIcon = L.divIcon({
      className: "custom-pin",
      html: `<div style="background:#7c4dff;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(124,77,255,0.6);border:2px solid #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    L.marker([currentCenter.lat, currentCenter.lng], { icon: homeIcon })
      .bindPopup(`<b>Household Center</b><br>${family.name}`)
      .addTo(markersLayerRef.current);

    // 2. Member locations
    memberLocations.forEach((m) => {
      const memberIcon = L.divIcon({
        className: "member-pin",
        html: `<div style="background:#00c853;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(0,200,83,0.5);border:2px solid #fff;font-weight:700;font-size:12px;">${m.name.charAt(0)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([m.latitude, m.longitude], { icon: memberIcon })
        .bindPopup(`<b>${m.name}</b><br>Precision: ${m.precision}<br>Updated: ${new Date(m.recorded_at).toLocaleTimeString()}`)
        .addTo(markersLayerRef.current!);
    });

    // 3. Place markers
    places.forEach((p) => {
      const placeIcon = L.divIcon({
        className: "place-pin",
        html: `<div style="background:#00b0ff;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(0,176,255,0.4);border:2px solid #fff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([p.latitude, p.longitude], { icon: placeIcon })
        .bindPopup(`<b>${p.name}</b><br>${p.address || p.category}<br>${p.distance_meters ? `${p.distance_meters}m away` : ""}`)
        .addTo(markersLayerRef.current!);
    });
  }, [places, memberLocations, currentCenter]);

  const toggleLocationSharing = async () => {
    const nextState = !sharingEnabled;
    try {
      await api.updateLocationSettings(family.id, {
        enabled: nextState,
        precision,
        retentionDays: 7,
      });
      setSharingEnabled(nextState);

      // If enabling, get device location and broadcast record
      if (nextState && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await api.recordLocation(family.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          const res = await api.getLatestLocations(family.id);
          setMemberLocations(res.locations || []);
        });
      }
    } catch (err: any) {
      alert(err.message || "Failed to update location sharing");
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCenter(coords);
        if (leafletMapRef.current) {
          leafletMapRef.current.flyTo([coords.lat, coords.lng], 15);
        }
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Location Sharing Controls & Search Bar */}
      <div className="glass-card" style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Category Select */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>NEARBY:</span>
            {[
              { id: "grocery", label: "Groceries" },
              { id: "pharmacy", label: "Pharmacy" },
              { id: "hospital", label: "Hospital" },
              { id: "restaurant", label: "Food" },
              { id: "barbershop", label: "Barber/Salon" },
              { id: "bank", label: "ATM/Bank" },
            ].map((cat) => (
              <button
                key={cat.id}
                className={`btn ${category === cat.id ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Location Sharing Opt-in Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.82rem" }}
              onClick={handleUseMyLocation}
              title="Center on my GPS location"
            >
              <Compass size={14} /> My GPS
            </button>

            <button
              className={`btn ${sharingEnabled ? "btn-primary" : "btn-secondary"}`}
              style={{
                padding: "6px 14px",
                fontSize: "0.82rem",
                background: sharingEnabled ? "var(--accent-emerald)" : undefined,
                boxShadow: sharingEnabled ? "0 0 14px rgba(0,200,83,0.3)" : undefined,
              }}
              onClick={toggleLocationSharing}
            >
              <Radio size={14} />
              <span>{sharingEnabled ? "Broadcasting Location" : "Share My Location"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Container (~75% screen height layout per Section 12) */}
      <div
        className="glass-card"
        style={{
          padding: 0,
          overflow: "hidden",
          height: "65vh",
          minHeight: 460,
          position: "relative",
        }}
      >
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

        {loading && (
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "var(--bg-surface-elevated)",
              backdropFilter: "blur(8px)",
              padding: "6px 14px",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.8rem",
              fontWeight: 600,
              zIndex: 1000,
              boxShadow: "var(--glass-shadow)",
            }}
          >
            Searching places...
          </div>
        )}
      </div>

      {/* Bottom Sheet Places List */}
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>
            Found {places.length} Real {category.toUpperCase()} Locations
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Radius: {(radius / 1000).toFixed(1)} km • Live OpenStreetMap Provider
          </span>
        </div>

        {places.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px 0" }}>
            <MapPin className="empty-icon" style={{ width: 40, height: 40 }} />
            <div className="empty-title">No establishments found in this radius</div>
            <div className="empty-subtitle">Try selecting a different category or centering on a busier location.</div>
          </div>
        ) : (
          <div className="grid-cols-3">
            {places.map((place) => (
              <div
                key={place.id}
                style={{
                  padding: 14,
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "var(--glass-border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (leafletMapRef.current) {
                    leafletMapRef.current.flyTo([place.latitude, place.longitude], 16);
                  }
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{place.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {place.address || "Address available on map"}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)" }}>
                    {place.distance_meters ? `${(place.distance_meters / 1000).toFixed(2)} km away` : "Nearby"}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", textDecoration: "underline" }}>
                    View on Map
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
