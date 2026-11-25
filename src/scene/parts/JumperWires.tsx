import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { WireSpec } from '../../engine/LogicEngine';
import { SOCKET_MAP, type Vec3 } from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { playWirePlug, playWireUnplug } from '../../utils/soundEffects';
import {
  TOUCH_CLICK_GUARD_MS,
  TOUCH_SNAP_RADIUS,
  findNearestActiveSocket,
  touchWiringBridge,
} from '../touchWiringBridge';

// Shared static Dupont boot, collar, & invisible tracking plane assets (never disposed on unmount)
const SHARED_BOOT_GEO = new THREE.CylinderGeometry(0.088, 0.088, 0.42, 12);
const SHARED_COLLAR_GEO = new THREE.CylinderGeometry(0.068, 0.072, 0.05, 12);
const SHARED_BOOT_MAT = new THREE.MeshStandardMaterial({
  color: '#1a1e26',
  roughness: 0.45,
  metalness: 0.15,
});
const SHARED_GHOST_TRACK_MAT = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
});

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
  const p1 = new THREE.Vector3(from.x, from.y + 0.74, from.z);
  const p2 = new THREE.Vector3((from.x + to.x) / 2 + perpX * sway, apexY, (from.z + to.z) / 2 + perpZ * sway);
  const p3 = new THREE.Vector3(to.x, to.y + 0.74, to.z);
  const p4 = new THREE.Vector3(to.x, to.y + 0.34, to.z);

  return new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4], false, 'catmullrom', 0.45);
}

const SeatedWire = memo(function SeatedWire({
  wire,
  isSelected,
  isHighPerf,
}: {
  wire: WireSpec;
  isSelected: boolean;
  isHighPerf: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const tubeMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const signalFlowEnabled = useSimulatorStore((s) => s.signalFlowEnabled);
  const teachingMode = useSimulatorStore((s) => s.teachingMode);
  const showElectricity = signalFlowEnabled || teachingMode;
  const wireSignal = useSimulatorStore((s) => s.socketStates[wire.fromSocketId] ?? 'FLOATING');
  const errorWarningsEnabled = useSimulatorStore((s) => s.errorWarningsEnabled);

  // Granular primitive ERC status selector per wire (does not rebuild TubeGeometry)
  const ercSeverity = useSimulatorStore<'error' | 'warning' | null>((s) => {
    if (!s.errorWarningsEnabled) return null;
    let found: 'error' | 'warning' | null = null;
    for (const d of s.wiringDiagnostics) {
      if (d.affectedWireIds.includes(wire.id)) {
        if (d.severity === 'error') return 'error';
        found = 'warning';
      }
    }
    return found;
  });

  const isDiagHighlighted = useSimulatorStore((s) => {
    if (!s.errorWarningsEnabled || !s.highlightedDiagnosticId) return false;
    const match = s.wiringDiagnostics.find((d) => d.id === s.highlightedDiagnosticId);
    return Boolean(match?.affectedWireIds.includes(wire.id));
  });

  const invalidate = useThree((s) => s.invalidate);

  const fromSock = SOCKET_MAP[wire.fromSocketId];
  const toSock = SOCKET_MAP[wire.toSocketId];

  const showErcHighlight = errorWarningsEnabled && (ercSeverity !== null || isDiagHighlighted);
  const showXrayHalo =
    showElectricity && (wireSignal === 'HIGH' || wireSignal === 'CONFLICT');
  const needHalo = isSelected || showXrayHalo || (errorWarningsEnabled && (ercSeverity === 'error' || isDiagHighlighted));

  // Strictly memoize curve + primary TubeGeometry ONLY on endpoint geometry, wire ID & LOD quality
  const curve = useMemo(() => {
    if (!fromSock || !toSock) return null;
    return buildJumperCurve(fromSock.position, toSock.position, wire.id);
  }, [fromSock, toSock, wire.id]);

  const tubeGeo = useMemo(
    () =>
      curve
        ? new THREE.TubeGeometry(curve, isHighPerf ? 24 : 16, 0.056, isHighPerf ? 8 : 6, false)
        : null,
    [curve, isHighPerf]
  );

  const haloGeo = useMemo(
    () =>
      curve && needHalo
        ? new THREE.TubeGeometry(curve, isHighPerf ? 20 : 14, 0.095, isHighPerf ? 6 : 5, false)
        : null,
    [curve, needHalo, isHighPerf]
  );

  useEffect(() => {
    return () => {
      tubeGeo?.dispose();
    };
  }, [tubeGeo]);

  useEffect(() => {
    return () => {
      haloGeo?.dispose();
    };
  }, [haloGeo]);

  useFrame(({ clock }) => {
    if (!tubeMatRef.current) return;
    if ((showElectricity && wireSignal === 'CONFLICT') || (showErcHighlight && ercSeverity === 'error')) {
      tubeMatRef.current.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 11) * 0.7;
      invalidate();
    } else if (showErcHighlight && isDiagHighlighted) {
      tubeMatRef.current.emissiveIntensity = 1.15 + Math.sin(clock.elapsedTime * 8) * 0.55;
      invalidate();
    }
  });

  useEffect(() => {
    return () => {
      if (hovered) {
        document.body.style.cursor = 'auto';
      }
    };
  }, [hovered]);

  let matColor = wire.color;
  let matEmissive = isSelected || hovered ? wire.color : '#000000';
  let matEmissiveIntensity = isSelected ? 0.55 : hovered ? 0.25 : 0;
  let matTransparent = false;
  let matOpacity = 1;
  let haloColor = '#38bdf8';
  let haloOpacity = 0.38;

  if (showElectricity) {
    if (wireSignal === 'HIGH') {
      matColor = '#4ade80';
      matEmissive = '#22c55e';
      matEmissiveIntensity = isSelected ? 1.5 : 1.25;
      haloColor = isSelected ? '#38bdf8' : '#4ade80';
      haloOpacity = isSelected ? 0.42 : 0.28;
    } else if (wireSignal === 'LOW') {
      matColor = teachingMode ? '#991b1b' : '#334155';
      matEmissive = isSelected ? '#38bdf8' : teachingMode ? '#7f1d1d' : '#000000';
      matEmissiveIntensity = isSelected ? 0.45 : teachingMode ? 0.35 : 0;
      matTransparent = true;
      matOpacity = teachingMode ? 0.78 : 0.58;
    } else if (wireSignal === 'CONFLICT') {
      matColor = '#ef4444';
      matEmissive = '#f59e0b';
      matEmissiveIntensity = 1.6;
      haloColor = '#ef4444';
      haloOpacity = 0.4;
    } else {
      matColor = '#64748b';
      matEmissive = isSelected ? '#38bdf8' : '#000000';
      matEmissiveIntensity = isSelected ? 0.45 : 0;
      matTransparent = true;
      matOpacity = 0.48;
    }
  }

  // ERC Warning / Error visual emphasis (superseded by clean selection halo)
  if (showErcHighlight && !isSelected) {
    if (ercSeverity === 'error') {
      matEmissive = '#ef4444';
      matEmissiveIntensity = 1.5;
      haloColor = '#ef4444';
      haloOpacity = isDiagHighlighted ? 0.48 : 0.34;
    } else if (ercSeverity === 'warning') {
      matEmissive = '#f59e0b';
      matEmissiveIntensity = isDiagHighlighted ? 1.25 : 0.65;
      haloColor = '#f59e0b';
      haloOpacity = isDiagHighlighted ? 0.4 : 0.24;
    }
  }

  useEffect(() => {
    if (tubeMatRef.current) {
      tubeMatRef.current.needsUpdate = true;
    }
  }, [matTransparent]);

  if (!fromSock || !toSock || !tubeGeo) return null;

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch') return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === 'touch') return;
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
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
        castShadow={isHighPerf}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <meshStandardMaterial
          ref={tubeMatRef}
          color={matColor}
          emissive={matEmissive}
          emissiveIntensity={matEmissiveIntensity}
          transparent={matTransparent}
          opacity={matOpacity}
          roughness={showElectricity && wireSignal === 'HIGH' ? 0.25 : 0.36}
          metalness={0.08}
        />
      </mesh>

      {/* Translucent glowing selection, X-Ray, or ERC error halo */}
      {needHalo && haloGeo && (
        <mesh geometry={haloGeo} renderOrder={2}>
          <meshBasicMaterial
            color={haloColor}
            transparent
            opacity={haloOpacity}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Molded Dupont connector boots seated into both header sockets */}
      {[fromSock.position, toSock.position].map((pos, idx) => (
        <group key={idx} position={[pos.x, pos.y, pos.z]}>
          <mesh
            position={[0, 0.19, 0]}
            geometry={SHARED_BOOT_GEO}
            material={SHARED_BOOT_MAT}
            castShadow={isHighPerf}
          />
          <mesh position={[0, 0.41, 0]} geometry={SHARED_COLLAR_GEO}>
            <meshStandardMaterial color={wire.color} roughness={0.4} metalness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

const GhostPreviewWire = memo(function GhostPreviewWire({
  pendingSocketId,
  isHighPerf,
}: {
  pendingSocketId: string;
  isHighPerf: boolean;
}) {
  const originSock = SOCKET_MAP[pendingSocketId];
  const activeWireColor = useSimulatorStore((s) => s.activeWireColor);
  const invalidate = useThree((s) => s.invalidate);

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

  // Touch drag-to-wire completion / tap-to-wire preservation on window pointerup
  useEffect(() => {
    const handleTouchEnd = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (e.pointerId !== touchWiringBridge.activeTouchDragPointerId) return;

      touchWiringBridge.activeTouchDragPointerId = null;
      touchWiringBridge.touchOriginSocketId = null;
      touchWiringBridge.lastTouchHandledAt = performance.now();

      const wasDragged = touchWiringBridge.touchDragMoved;
      touchWiringBridge.touchDragMoved = false;

      const store = useSimulatorStore.getState();
      if (e.type === 'pointercancel') {
        store.cancelWiring();
        store.setHoveredSocketId(null);
        return;
      }

      const snapTarget = store.hoveredSocketId;
      if (snapTarget && snapTarget !== pendingSocketId) {
        const res = store.completeWiring(snapTarget);
        store.setHoveredSocketId(null);
        if (res.ok && store.soundEnabled) {
          playWirePlug();
        }
        return;
      }

      if (wasDragged) {
        store.cancelWiring();
        store.setHoveredSocketId(null);
      }
      // If lifted on origin without dragging away, leave pendingSocketId latched for tap-to-wire!
    };

    window.addEventListener('pointerup', handleTouchEnd, true);
    window.addEventListener('pointercancel', handleTouchEnd, true);
    return () => {
      window.removeEventListener('pointerup', handleTouchEnd, true);
      window.removeEventListener('pointercancel', handleTouchEnd, true);
    };
  }, [pendingSocketId]);

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
    const nextGeo = new THREE.TubeGeometry(curve, isHighPerf ? 24 : 16, 0.052, 7, false);
    const prevGeo = currentGeoRef.current;
    tubeMeshRef.current.geometry = nextGeo;
    currentGeoRef.current = nextGeo;
    prevGeo?.dispose();
    invalidate();
  });

  if (!originSock) return null;

  return (
    <group name="ghost-preview-wire">
      {/* Origin Dupont boot seated at start socket */}
      <mesh
        position={[originSock.position.x, originSock.position.y + 0.19, originSock.position.z]}
        geometry={SHARED_BOOT_GEO}
        material={SHARED_BOOT_MAT}
      />

      {/* Snapped target preview boot */}
      <mesh ref={snapBootRef} visible={false} geometry={SHARED_BOOT_GEO}>
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* Translucent glowing ghost wire arch */}
      <mesh ref={tubeMeshRef} renderOrder={2}>
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
        material={SHARED_GHOST_TRACK_MAT}
        onPointerMove={(e) => {
          pointerTargetRef.current.set(e.point.x, 0.28, e.point.z);
          if (
            e.pointerType === 'touch' &&
            touchWiringBridge.activeTouchDragPointerId === e.pointerId
          ) {
            const distFromOrigin = Math.hypot(
              e.point.x - originSock.position.x,
              e.point.z - originSock.position.z
            );
            if (distFromOrigin > 0.26) {
              touchWiringBridge.touchDragMoved = true;
            }
            const nearest = findNearestActiveSocket(
              e.point.x,
              e.point.z,
              TOUCH_SNAP_RADIUS,
              pendingSocketId
            );
            const store = useSimulatorStore.getState();
            const nextId = nearest ? nearest.id : null;
            if (store.hoveredSocketId !== nextId) {
              store.setHoveredSocketId(nextId);
            }
          }
          invalidate();
        }}
        onClick={(e) => {
          if (performance.now() - touchWiringBridge.lastTouchHandledAt < TOUCH_CLICK_GUARD_MS) {
            e.stopPropagation();
            return;
          }
          if (e.delta > 8) return;
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
      </mesh>
    </group>
  );
});

/**
 * Renders all seated 3D CatmullRom jumper wires with Dupont boots,
 * ERC diagnostic error/warning highlights, magnetic ghost preview, and shortcuts.
 */
export const JumperWires = memo(function JumperWires() {
  const wires = useSimulatorStore((s) => s.wires);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const pendingSocketId = useSimulatorStore((s) => s.pendingSocketId);
  const isHighPerf = useSimulatorStore((s) => s.performanceMode === 'high');

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
          isHighPerf={isHighPerf}
        />
      ))}

      {pendingSocketId && (
        <GhostPreviewWire pendingSocketId={pendingSocketId} isHighPerf={isHighPerf} />
      )}
    </group>
  );
});
