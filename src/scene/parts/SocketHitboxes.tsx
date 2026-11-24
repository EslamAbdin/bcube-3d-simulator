import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ALL_MODULES,
  ALL_SOCKETS,
  BOARD_DIMENSIONS,
  SOCKET_MAP,
  type SocketSpec,
} from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { playWirePlug } from '../../utils/soundEffects';

function buildPairedSocketMap(): Record<string, SocketSpec> {
  const byNode = new Map<string, SocketSpec[]>();
  for (const s of ALL_SOCKETS) {
    const arr = byNode.get(s.nodeId) ?? [];
    arr.push(s);
    byNode.set(s.nodeId, arr);
  }
  const map: Record<string, SocketSpec> = {};
  for (const group of byNode.values()) {
    if (group.length === 2) {
      map[group[0].id] = group[1];
      map[group[1].id] = group[0];
    }
  }
  return map;
}

function resolvePickedSocket(
  e: ThreeEvent<PointerEvent | MouseEvent>,
  pairedSocketMap: Record<string, SocketSpec>
): SocketSpec | null {
  if (e.instanceId === undefined) return null;
  const candidate = ALL_SOCKETS[e.instanceId];
  if (!candidate) return null;

  let picked = candidate;
  const paired = pairedSocketMap[candidate.id];
  if (paired) {
    const distCand =
      (e.point.x - candidate.position.x) ** 2 + (e.point.z - candidate.position.z) ** 2;
    const distPair =
      (e.point.x - paired.position.x) ** 2 + (e.point.z - paired.position.z) ** 2;
    if (distPair < distCand) {
      picked = paired;
    }
  }
  return picked;
}

function ActiveSocketHitboxes() {
  const colliderRef = useRef<THREE.InstancedMesh>(null);
  const primaryRingRef = useRef<THREE.Mesh>(null);
  const originRingRef = useRef<THREE.Mesh>(null);

  const hoveredSocketId = useSimulatorStore((s) => s.hoveredSocketId);
  const pendingSocketId = useSimulatorStore((s) => s.pendingSocketId);
  const pairedSocketMap = useMemo(() => buildPairedSocketMap(), []);

  // Radius >= 0.145 ensures effortless clicking on both 3D and 2D views
  const colliderGeo = useMemo(() => new THREE.CylinderGeometry(0.145, 0.145, 0.08, 12), []);
  const colliderMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    []
  );

  useEffect(() => {
    return () => {
      colliderGeo.dispose();
      colliderMat.dispose();
      document.body.style.cursor = 'auto';
    };
  }, [colliderGeo, colliderMat]);

  useLayoutEffect(() => {
    const mesh = colliderRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    ALL_SOCKETS.forEach((s, idx) => {
      dummy.position.set(s.position.x, s.position.y + 0.025, s.position.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (primaryRingRef.current) {
      const s = 1.04 + Math.sin(t * 7) * 0.06;
      primaryRingRef.current.scale.set(s, s, 1);
    }
    if (originRingRef.current) {
      const s = 1.08 + Math.sin(t * 8.5) * 0.12;
      originRingRef.current.scale.set(s, s, 1);
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const picked = resolvePickedSocket(e, pairedSocketMap);
    if (!picked) return;

    const store = useSimulatorStore.getState();
    if (store.hoveredSocketId !== picked.id) {
      store.setHoveredSocketId(picked.id);
    }
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const store = useSimulatorStore.getState();
    if (store.hoveredSocketId !== null) {
      store.setHoveredSocketId(null);
    }
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Guard against completing/starting wires after camera drag/orbit
    if (e.delta > 5) return;
    e.stopPropagation();

    const picked = resolvePickedSocket(e, pairedSocketMap);
    if (!picked) return;

    const store = useSimulatorStore.getState();
    if (!store.pendingSocketId) {
      store.startWiring(picked.id);
      if (store.soundEnabled) {
        playWirePlug();
      }
    } else {
      const res = store.completeWiring(picked.id);
      if (res.ok && store.soundEnabled) {
        playWirePlug();
      }
    }
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    const store = useSimulatorStore.getState();
    if (!store.pendingSocketId) return;
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    store.cancelWiring();
  };

  const hoveredPrimary = hoveredSocketId ? SOCKET_MAP[hoveredSocketId] : undefined;
  const hoveredPaired = hoveredPrimary ? pairedSocketMap[hoveredPrimary.id] : undefined;
  const originSocket = pendingSocketId ? SOCKET_MAP[pendingSocketId] : undefined;

  return (
    <group name="active-socket-hitboxes">
      <instancedMesh
        ref={colliderRef}
        args={[colliderGeo, colliderMat, ALL_SOCKETS.length]}
        frustumCulled={false}
        onPointerOver={handlePointerMove}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Pulsing gold origin ring when a wire starts at pendingSocketId */}
      {originSocket && (
        <mesh
          ref={originRingRef}
          position={[originSocket.position.x, originSocket.position.y + 0.011, originSocket.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.088, 0.16, 24]} />
          <meshBasicMaterial color="#facc15" toneMapped={false} transparent opacity={0.96} />
        </mesh>
      )}

      {hoveredPrimary && hoveredPrimary.id !== pendingSocketId && (
        <mesh
          ref={primaryRingRef}
          position={[hoveredPrimary.position.x, hoveredPrimary.position.y + 0.008, hoveredPrimary.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.082, 0.142, 24]} />
          <meshBasicMaterial color="#38bdf8" toneMapped={false} transparent opacity={0.95} />
        </mesh>
      )}

      {hoveredPaired && hoveredPaired.id !== pendingSocketId && (
        <mesh
          position={[hoveredPaired.position.x, hoveredPaired.position.y + 0.007, hoveredPaired.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.078, 0.124, 24]} />
          <meshBasicMaterial color="#7dd3fc" toneMapped={false} transparent opacity={0.62} />
        </mesh>
      )}
    </group>
  );
}

function StandbyHoverZones() {
  const standbyModules = useMemo(
    () => ALL_MODULES.filter((m) => m.status === 'standby'),
    []
  );
  const hoveredStandbyModuleId = useSimulatorStore((s) => s.hoveredStandbyModuleId);

  return (
    <group name="standby-hover-zones">
      {standbyModules.map((mod) => {
        const isHovered = hoveredStandbyModuleId === mod.id;
        const boxHeight = mod.isDaughterModule ? 0.46 : 0.52;
        const boxY = mod.isDaughterModule ? 0.25 : 0.26;
        const overlayY = mod.isDaughterModule
          ? BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.004
          : 0.009;

        return (
          <group key={mod.id}>
            <mesh
              position={[mod.position.x, boxY, mod.position.z]}
              onPointerOver={(e) => {
                e.stopPropagation();
                const state = useSimulatorStore.getState();
                if (!state.hoveredSocketId && state.hoveredStandbyModuleId !== mod.id) {
                  state.setHoveredStandbyModuleId(mod.id);
                }
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                const state = useSimulatorStore.getState();
                if (state.hoveredStandbyModuleId === mod.id) {
                  state.setHoveredStandbyModuleId(null);
                }
              }}
            >
              <boxGeometry args={[mod.size.width, boxHeight, mod.size.depth]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {isHovered && (
              <mesh position={[mod.position.x, overlayY, mod.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[mod.size.width - 0.12, mod.size.depth - 0.12]} />
                <meshBasicMaterial color="#cbd5e1" transparent opacity={0.14} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Combines invisible active-socket raycast hitboxes (hover + click-to-wire)
 * and standby module hover zones for bottom-HUD inspection.
 */
export function SocketHitboxes() {
  return (
    <group name="socket-and-standby-hitboxes">
      <ActiveSocketHitboxes />
      <StandbyHoverZones />
    </group>
  );
}
