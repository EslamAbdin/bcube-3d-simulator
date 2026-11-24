import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { WireSpec } from '../../engine/LogicEngine';
import { SOCKET_MAP, type Vec3 } from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { playWireUnplug } from '../../utils/soundEffects';

function hashWireId(id: string): { hashY: number; hashLat: number } {
  let h1 = 2166136261;
  let h2 = 374761393;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = Math.imul(h2 ^ ch, 2246822519);
  }
  const hashY = ((h1 >>> 0) % 1000) / 500 - 1; // [-1, 1]
  const hashLat = ((h2 >>> 0) % 1000) / 500 - 1; // [-1, 1]
  return { hashY, hashLat };
}

function buildJumperCurve(from: Vec3, to: Vec3, wireId: string): THREE.CatmullRomCurve3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  const { hashY, hashLat } = hashWireId(wireId);

  // Perpendicular XZ unit vector for subtle anti-clipping lateral separation
  const perpX = dist > 1e-4 ? -dz / dist : 0;
  const perpZ = dist > 1e-4 ? dx / dist : 1;

  const apexY = Math.max(from.y, to.y) + 0.92 + Math.min(dist * 0.145, 3.6) + hashY * 0.26;
  const sway = hashLat * Math.min(0.42, dist * 0.055 + 0.08);

  const p0 = new THREE.Vector3(from.x, from.y + 0.34, from.z);
  const p1 = new THREE.Vector3(from.x, from.y + 0.72, from.z);
  const p2 = new THREE.Vector3((from.x + to.x) / 2 + perpX * sway, apexY, (from.z + to.z) / 2 + perpZ * sway);
  const p3 = new THREE.Vector3(to.x, to.y + 0.72, to.z);
  const p4 = new THREE.Vector3(to.x, to.y + 0.34, to.z);

  return new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4], false, 'catmullrom', 0.45);
}

interface SharedBootAssets {
  bootGeo: THREE.CylinderGeometry;
  collarGeo: THREE.CylinderGeometry;
  bootMat: THREE.MeshStandardMaterial;
}

function SeatedWire({
  wire,
  isSelected,
  assets,
}: {
  wire: WireSpec;
  isSelected: boolean;
  assets: SharedBootAssets;
}) {
  const [hovered, setHovered] = useState(false);

  const fromSock = SOCKET_MAP[wire.fromSocketId];
  const toSock = SOCKET_MAP[wire.toSocketId];

  const { tubeGeo, haloGeo } = useMemo(() => {
    if (!fromSock || !toSock) {
      return { tubeGeo: null, haloGeo: null };
    }
    const curve = buildJumperCurve(fromSock.position, toSock.position, wire.id);
    return {
      tubeGeo: new THREE.TubeGeometry(curve, 40, 0.056, 10, false),
      haloGeo: isSelected ? new THREE.TubeGeometry(curve, 36, 0.095, 10, false) : null,
    };
  }, [fromSock, toSock, wire.id, isSelected]);

  useEffect(() => {
    return () => {
      tubeGeo?.dispose();
      haloGeo?.dispose();
    };
  }, [tubeGeo, haloGeo]);

  useEffect(() => {
    return () => {
      if (hovered) {
        document.body.style.cursor = 'auto';
      }
    };
  }, [hovered]);

  if (!fromSock || !toSock || !tubeGeo) return null;

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    const store = useSimulatorStore.getState();
    store.selectWire(isSelected ? null : wire.id);
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    const store = useSimulatorStore.getState();
    store.removeWire(wire.id);
    if (store.soundEnabled) {
      playWireUnplug();
    }
  };

  return (
    <group name={`jumper-wire-${wire.id}`}>
      {/* Insulated flexible wire arch */}
      <mesh
        geometry={tubeGeo}
        castShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <meshStandardMaterial
          color={wire.color}
          emissive={isSelected || hovered ? wire.color : '#000000'}
          emissiveIntensity={isSelected ? 0.55 : hovered ? 0.25 : 0}
          roughness={0.36}
          metalness={0.08}
        />
      </mesh>

      {/* Translucent glowing selection outline */}
      {isSelected && haloGeo && (
        <mesh geometry={haloGeo}>
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.38}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Molded Dupont connector boots seated into both header sockets */}
      {[fromSock.position, toSock.position].map((pos, idx) => (
        <group key={idx} position={[pos.x, pos.y, pos.z]}>
          <mesh
            position={[0, 0.19, 0]}
            geometry={assets.bootGeo}
            material={assets.bootMat}
            castShadow
          />
          <mesh position={[0, 0.41, 0]} geometry={assets.collarGeo}>
            <meshStandardMaterial color={wire.color} roughness={0.4} metalness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GhostPreviewWire({
  pendingSocketId,
  assets,
}: {
  pendingSocketId: string;
  assets: SharedBootAssets;
}) {
  const originSock = SOCKET_MAP[pendingSocketId];
  const activeWireColor = useSimulatorStore((s) => s.activeWireColor);

  const tubeMeshRef = useRef<THREE.Mesh>(null);
  const snapBootRef = useRef<THREE.Mesh>(null);
  const pointerTargetRef = useRef(
    new THREE.Vector3(
      originSock ? originSock.position.x : 0,
      0.28,
      originSock ? originSock.position.z : 0
    )
  );
  const lastBuiltTargetRef = useRef(new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN));
  const currentGeoRef = useRef<THREE.TubeGeometry | null>(null);

  useEffect(() => {
    return () => {
      currentGeoRef.current?.dispose();
      currentGeoRef.current = null;
    };
  }, []);

  useFrame(() => {
    if (!originSock || !tubeMeshRef.current) return;

    const store = useSimulatorStore.getState();
    const hoveredId = store.hoveredSocketId;
    const snapSock =
      hoveredId && hoveredId !== pendingSocketId ? SOCKET_MAP[hoveredId] : undefined;

    const tx = snapSock ? snapSock.position.x : pointerTargetRef.current.x;
    const ty = snapSock ? snapSock.position.y : 0.28;
    const tz = snapSock ? snapSock.position.z : pointerTargetRef.current.z;

    if (snapBootRef.current) {
      snapBootRef.current.visible = Boolean(snapSock);
      if (snapSock) {
        snapBootRef.current.position.set(tx, ty + 0.19, tz);
      }
    }

    const dx = tx - lastBuiltTargetRef.current.x;
    const dy = ty - lastBuiltTargetRef.current.y;
    const dz = tz - lastBuiltTargetRef.current.z;
    if (
      Number.isFinite(lastBuiltTargetRef.current.x) &&
      dx * dx + dy * dy + dz * dz < 0.00025
    ) {
      return;
    }

    lastBuiltTargetRef.current.set(tx, ty, tz);
    const curve = buildJumperCurve(originSock.position, { x: tx, y: ty, z: tz }, 'ghost-wire');
    const nextGeo = new THREE.TubeGeometry(curve, 32, 0.052, 8, false);
    const prevGeo = currentGeoRef.current;
    tubeMeshRef.current.geometry = nextGeo;
    currentGeoRef.current = nextGeo;
    prevGeo?.dispose();
  });

  if (!originSock) return null;

  return (
    <group name="ghost-preview-wire">
      {/* Origin Dupont boot seated at start socket */}
      <mesh
        position={[originSock.position.x, originSock.position.y + 0.19, originSock.position.z]}
        geometry={assets.bootGeo}
        material={assets.bootMat}
        castShadow
      />

      {/* Snapped target preview boot */}
      <mesh ref={snapBootRef} visible={false} geometry={assets.bootGeo}>
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* Translucent glowing ghost wire arch */}
      <mesh ref={tubeMeshRef}>
        <bufferGeometry />
        <meshBasicMaterial
          color={activeWireColor}
          transparent
          opacity={0.78}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Invisible horizontal tracking plane above PCB */}
      <mesh
        position={[0, 0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          pointerTargetRef.current.set(e.point.x, 0.28, e.point.z);
        }}
        onClick={(e) => {
          if (e.delta > 5) return;
          e.stopPropagation();
          useSimulatorStore.getState().cancelWiring();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.nativeEvent.preventDefault();
          useSimulatorStore.getState().cancelWiring();
        }}
      >
        <planeGeometry args={[90, 70]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Renders all seated 3D CatmullRom jumper wires with Dupont boots,
 * live magnetic ghost preview wire, and Esc / Delete / Ctrl+Z / Right-Click shortcuts.
 */
export function JumperWires() {
  const wires = useSimulatorStore((s) => s.wires);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const pendingSocketId = useSimulatorStore((s) => s.pendingSocketId);

  const assets = useMemo<SharedBootAssets>(
    () => ({
      bootGeo: new THREE.CylinderGeometry(0.088, 0.088, 0.42, 14),
      collarGeo: new THREE.CylinderGeometry(0.068, 0.072, 0.05, 14),
      bootMat: new THREE.MeshStandardMaterial({
        color: '#1a1e26',
        roughness: 0.45,
        metalness: 0.15,
      }),
    }),
    []
  );

  useEffect(() => {
    return () => {
      assets.bootGeo.dispose();
      assets.collarGeo.dispose();
      assets.bootMat.dispose();
    };
  }, [assets]);

  // Global keyboard shortcuts: Esc (cancel), Delete/Backspace (delete selected), Ctrl/Cmd+Z (undo)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      const store = useSimulatorStore.getState();

      if (e.key === 'Escape') {
        store.cancelWiring();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedWireId) {
        e.preventDefault();
        store.removeWire(store.selectedWireId);
        if (store.soundEnabled) {
          playWireUnplug();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const undone = store.undoLastWire();
        if (undone && store.soundEnabled) {
          playWireUnplug();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Right-click anywhere cancels pending wiring cleanly without browser context menu
  useEffect(() => {
    if (!pendingSocketId) return;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      useSimulatorStore.getState().cancelWiring();
    };
    window.addEventListener('contextmenu', onContextMenu);
    return () => window.removeEventListener('contextmenu', onContextMenu);
  }, [pendingSocketId]);

  return (
    <group name="jumper-wires-layer">
      {wires.map((wire) => (
        <SeatedWire
          key={wire.id}
          wire={wire}
          isSelected={wire.id === selectedWireId}
          assets={assets}
        />
      ))}

      {pendingSocketId && (
        <GhostPreviewWire pendingSocketId={pendingSocketId} assets={assets} />
      )}
    </group>
  );
}
