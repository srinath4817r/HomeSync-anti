import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Family, FamilyMember } from "../types";
import { MapPin, Battery, CheckCircle2, Shield, HeartPulse, Clock, Sparkles, ChevronRight, X } from "lucide-react";

interface LivingHomeProps {
  family: Family;
  members: FamilyMember[];
  onNavigate: (view: any) => void;
  activeTasks?: any[];
  activeMeds?: any[];
}

// Stylized palette configurations for family member 3D avatars
const AVATAR_PALETTES = [
  { key: "me", shirt: 0x0284c7, hair: 0x27272a, skin: 0xfbd0b8, hairStyle: "short" },
  { key: "spouse", shirt: 0xe11d48, hair: 0x7c2d12, skin: 0xfce7d6, hairStyle: "long" },
  { key: "child1", shirt: 0x059669, hair: 0x1c1917, skin: 0xf5caa6, hairStyle: "curly" },
  { key: "senior", shirt: 0xd97706, hair: 0x94a3b8, skin: 0xfad6bc, hairStyle: "parted" },
  { key: "child2", shirt: 0x7c3aed, hair: 0x9a3412, skin: 0xfce4ce, hairStyle: "ponytail" },
  { key: "other", shirt: 0xea580c, hair: 0x3f3f46, skin: 0xf3be9e, hairStyle: "short" },
];

export const LivingHomeStage: React.FC<LivingHomeProps> = ({
  family,
  members,
  onNavigate,
  activeTasks = [],
  activeMeds = [],
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [hoveredMember, setHoveredMember] = useState<FamilyMember | null>(null);

  // Time-of-day ambient status
  const currentHour = new Date().getHours();
  const timePeriod =
    currentHour >= 5 && currentHour < 12
      ? "morning"
      : currentHour >= 12 && currentHour < 17
      ? "afternoon"
      : currentHour >= 17 && currentHour < 21
      ? "evening"
      : "night";

  // Three.js scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarMeshesRef = useRef<{ [userId: number]: THREE.Group }>({});
  const mouseCoordsRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 260;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 5.8);
    camera.lookAt(0, 0.4, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Time-based lighting
    const ambientLight = new THREE.AmbientLight(
      timePeriod === "morning"
        ? 0xffeedd
        : timePeriod === "afternoon"
        ? 0xffffff
        : timePeriod === "evening"
        ? 0xffdfba
        : 0x94a3b8,
      timePeriod === "night" ? 0.9 : 1.3
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 1.6);
    dirLight.position.set(3, 6, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Soft rim back-light for dimensional spatial depth
    const rimLight = new THREE.DirectionalLight(0xe05a47, 0.8);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    // 5. Hearth Pedestal Ground
    const groundGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.22, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x18202c,
      roughness: 0.65,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.11;
    ground.receiveShadow = true;
    scene.add(ground);

    // Architectural ambient glow ring on ground
    const ringGeo = new THREE.RingGeometry(3.2, 3.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe05a47,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    // 6. Build 3D Family Avatar Figurines
    const displayMembers =
      members.length > 0
        ? members
        : [
            { user_id: 1, name: "Alex (You)", role: "Primary Admin" } as any,
            { user_id: 2, name: "Sarah", role: "Caregiver" } as any,
            { user_id: 3, name: "Leo", role: "Child" } as any,
          ];

    const avatarGroups: { [userId: number]: THREE.Group } = {};
    const count = displayMembers.length;
    const spacing = Math.min(1.4, 4.6 / Math.max(count, 1));
    const startX = -((count - 1) * spacing) / 2;

    displayMembers.forEach((m, idx) => {
      const group = new THREE.Group();
      const palette = AVATAR_PALETTES[idx % AVATAR_PALETTES.length];

      // Figurine Base / Mini-Pedestal
      const baseGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.08, 24);
      const baseMat = new THREE.MeshStandardMaterial({
        color: palette.shirt,
        roughness: 0.4,
        metalness: 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.04;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // Status indicator ring on avatar base
      const isHome = idx % 3 !== 2; // e.g. active home indicator
      const statusRingGeo = new THREE.TorusGeometry(0.44, 0.02, 12, 32);
      const statusRingMat = new THREE.MeshBasicMaterial({
        color: isHome ? 0x059669 : 0x0284c7,
      });
      const statusRing = new THREE.Mesh(statusRingGeo, statusRingMat);
      statusRing.rotation.x = Math.PI / 2;
      statusRing.position.y = 0.05;
      group.add(statusRing);

      // Torso / Cozy Sweater
      const bodyGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.48, 20);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: palette.shirt,
        roughness: 0.55,
        metalness: 0.05,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.32;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // Collar / Scarf detail
      const collarGeo = new THREE.TorusGeometry(0.18, 0.04, 12, 24);
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
      });
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.rotation.x = Math.PI / 2;
      collarMesh.position.y = 0.56;
      group.add(collarMesh);

      // Head Group (for independent nodding and gaze)
      const headGroup = new THREE.Group();
      headGroup.position.y = 0.85;

      // Stylized Head
      const headGeo = new THREE.SphereGeometry(0.25, 24, 24);
      const headMat = new THREE.MeshStandardMaterial({
        color: palette.skin,
        roughness: 0.6,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.castShadow = true;
      headGroup.add(headMesh);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.27, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
      const hairMat = new THREE.MeshStandardMaterial({
        color: palette.hair,
        roughness: 0.45,
      });
      const hairMesh = new THREE.Mesh(hairGeo, hairMat);
      hairMesh.position.set(0, 0.04, -0.02);
      headGroup.add(hairMesh);

      // Friendly Stylized Eyes
      const eyeGeo = new THREE.SphereGeometry(0.03, 12, 12);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(0.08, 0.03, 0.22);
      headGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(-0.08, 0.03, 0.22);
      headGroup.add(rightEye);

      group.add(headGroup);

      // Position in semicircle
      const posX = startX + idx * spacing;
      const posZ = -Math.abs(posX) * 0.18;
      group.position.set(posX, 0, posZ);

      // Store references
      (group as any).userData = {
        member: m,
        headGroup,
        initialY: 0,
        initialZ: posZ,
        initialX: posX,
        phase: idx * 0.85,
        isHome,
      };

      scene.add(group);
      avatarGroups[m.user_id] = group;
    });

    avatarMeshesRef.current = avatarGroups;

    // 7. Mouse Movement Listener for Interactive 3D Gaze
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseCoordsRef.current = { x, y };

      // Raycasting for hover detection
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const allMeshChildren: THREE.Object3D[] = [];
      Object.values(avatarGroups).forEach((g) => allMeshChildren.push(...g.children));
      const intersects = raycaster.intersectObjects(allMeshChildren, true);

      if (intersects.length > 0) {
        let parent = intersects[0].object.parent;
        while (parent && !parent.userData.member && parent !== scene) {
          parent = parent.parent;
        }
        if (parent?.userData?.member) {
          setHoveredMember(parent.userData.member);
          container.style.cursor = "pointer";
          return;
        }
      }
      setHoveredMember(null);
      container.style.cursor = "default";
    };

    // 8. Click Listener to Select Avatar
    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const allMeshChildren: THREE.Object3D[] = [];
      Object.values(avatarGroups).forEach((g) => allMeshChildren.push(...g.children));
      const intersects = raycaster.intersectObjects(allMeshChildren, true);

      if (intersects.length > 0) {
        let parent = intersects[0].object.parent;
        while (parent && !parent.userData.member && parent !== scene) {
          parent = parent.parent;
        }
        if (parent?.userData?.member) {
          setSelectedMember(parent.userData.member);
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);

    // 9. Smooth Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Gentle, calm idle breathing & spatial gaze
      Object.values(avatarGroups).forEach((group) => {
        const uData = group.userData;
        if (!uData) return;

        // Subtle breathing float: ~2mm sine wave
        const floatY = Math.sin(time * 1.8 + uData.phase) * 0.025;
        const isHovered = hoveredMember?.user_id === uData.member.user_id;
        const isSelected = selectedMember?.user_id === uData.member.user_id;

        // Smooth elevation on hover/select
        const targetLift = isSelected ? 0.16 : isHovered ? 0.09 : 0;
        group.position.y += (uData.initialY + floatY + targetLift - group.position.y) * 0.12;

        // Smooth gaze toward mouse coords
        const targetRotY = (mouseCoordsRef.current.x * 0.35 - (group.position.x * 0.15));
        const targetRotX = -mouseCoordsRef.current.y * 0.15;
        group.rotation.y += (targetRotY - group.rotation.y) * 0.08;

        if (uData.headGroup) {
          uData.headGroup.rotation.x += (targetRotX - uData.headGroup.rotation.x) * 0.1;
          uData.headGroup.rotation.y += (targetRotY * 0.5 - uData.headGroup.rotation.y) * 0.1;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 10. Responsive resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 260;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [members, hoveredMember, selectedMember, timePeriod]);

  const activeCount = members.length || 3;
  const homeCount = Math.max(1, Math.round(activeCount * 0.75));

  return (
    <div
      className="glass-card living-home-container"
      style={{
        padding: 0,
        overflow: "hidden",
        position: "relative",
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Stage Header Info Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 22px 10px",
          borderBottom: "1px solid var(--border-subtle)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.08rem",
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              Living Home Presence
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                background: "var(--chip-task-bg)",
                border: "1px solid var(--chip-task-border)",
                color: "var(--chip-task)",
                fontSize: "0.72rem",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--chip-task)",
                  display: "inline-block",
                }}
              />
              {homeCount} of {activeCount} at Home
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
            {timePeriod === "morning"
              ? "Morning routine active • All systems synced"
              : timePeriod === "afternoon"
              ? "Daytime coordination • Household active"
              : timePeriod === "evening"
              ? "Evening gathering • Dinner prep at 6:30 PM"
              : "Night mode • Quiet hours active"}
          </p>
        </div>

        {/* Quick Family Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="action-glass-pill"
            style={{ fontSize: "0.78rem", padding: "6px 12px" }}
            onClick={() => onNavigate("Map")}
          >
            <MapPin size={13} color="var(--chip-map)" />
            <span>Full Map</span>
          </button>
          <button
            type="button"
            className="action-glass-pill"
            style={{ fontSize: "0.78rem", padding: "6px 12px" }}
            onClick={() => onNavigate("Family")}
          >
            <Shield size={13} color="var(--accent)" />
            <span>Manage</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: 250,
          position: "relative",
          outline: "none",
        }}
      />

      {/* Interactive Avatar Strip & Hover Hint */}
      <div
        style={{
          padding: "10px 20px 14px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {(members.length > 0 ? members : [{ user_id: 1, name: "Alex" } as any]).map((m, idx) => {
            const isSelected = selectedMember?.user_id === m.user_id;
            const isHovered = hoveredMember?.user_id === m.user_id;
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => setSelectedMember(m)}
                style={{
                  background: isSelected ? "var(--surface-card)" : "transparent",
                  border: isSelected ? "1px solid var(--accent)" : "1px solid transparent",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-pill)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  transform: isHovered || isSelected ? "translateY(-1px)" : "none",
                  boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: idx % 3 === 2 ? "var(--chip-map)" : "var(--chip-task)",
                  }}
                />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>
                  {m.name.split(" ")[0]}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {idx % 3 === 2 ? "School" : "Home"}
                </span>
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
          Click an avatar or member to reveal live status
        </span>
      </div>

      {/* Selected Member Spatial Detail Drawer (Smooth contextual expansion) */}
      {selectedMember && (
        <div
          style={{
            position: "absolute",
            inset: "auto 16px 16px 16px",
            background: "var(--surface-card)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-elevated)",
            padding: "16px 20px",
            zIndex: 40,
            animation: "modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                }}
              >
                {selectedMember.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>
                  {selectedMember.name}
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  {selectedMember.role.replace(/_/g, " ")} • Connected Device
                </div>
              </div>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={() => setSelectedMember(null)}
              style={{ width: 30, height: 30 }}
            >
              <X size={15} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10,
              margin: "12px 0",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Location</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--chip-task)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <MapPin size={12} />
                <span>At Residence</span>
              </div>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Device Battery</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Battery size={12} color="#10B981" />
                <span>92% • Active</span>
              </div>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Chores Assigned</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <CheckCircle2 size={12} color="var(--accent)" />
                <span>2 Pending today</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => onNavigate("Tasks")}
            >
              Assign Chore
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.78rem", padding: "6px 14px" }}
              onClick={() => onNavigate("Family")}
            >
              View Full Profile <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
