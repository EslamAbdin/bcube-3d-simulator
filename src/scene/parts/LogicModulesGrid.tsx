import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  ALL_MODULES,
  BOARD_DIMENSIONS,
  getGateModuleLayout,
  type ActiveGateModuleType,
  type BoardModuleSpec,
} from '../../schema/boardSchema';
import {
  createActiveGateModuleTexture,
  useCanvasTexture,
} from '../textures/silkscreenGenerator';
import { DipICChip } from './DipICChip';
import { GateElectricityOverlay } from './GateElectricityOverlay';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { playButtonSnap } from '../../utils/soundEffects';

const ACTIVE_IC_CODES: Record<ActiveGateModuleType, string> = {
  IC_7400: 'SN74LS00N',
  IC_7402: 'SN74LS02N',
  IC_7404: 'SN74LS04N',
  IC_7408: 'SN74LS08N',
  IC_7432: 'SN74LS32N',
  IC_7486: 'SN74LS86N',
};

const { width: DAUGHTER_W, depth: DAUGHTER_D, thickness: DAUGHTER_T } = BOARD_DIMENSIONS.daughterModule;

const SHARED_DAUGHTER_PCB_GEO = new THREE.BoxGeometry(DAUGHTER_W, DAUGHTER_T, DAUGHTER_D);
const SHARED_DAUGHTER_PLANE_GEO = new THREE.PlaneGeometry(DAUGHTER_W, DAUGHTER_D);
const SHARED_COL0_PLANE_GEO = new THREE.PlaneGeometry(5.2, 3.92);
const SHARED_ACTIVE_SLAB_MAT = new THREE.MeshStandardMaterial({
  color: '#0a598c',
  roughness: 0.55,
  metalness: 0.06,
});

// 6-sided authentic brass hex standoffs & top corner mounting posts (for removable daughter cards)
const SHARED_BRASS_STANDOFF_GEO = new THREE.CylinderGeometry(0.115, 0.115, 0.052, 6);
const SHARED_BRASS_POST_GEO = new THREE.CylinderGeometry(0.11, 0.11, 0.042, 6);
const SHARED_BRASS_BORE_GEO = new THREE.CylinderGeometry(0.045, 0.045, 0.046, 10);
const SHARED_BRASS_MAT = new THREE.MeshStandardMaterial({
  color: '#d4a017',
  roughness: 0.26,
  metalness: 0.86,
});
const SHARED_BORE_MAT = new THREE.MeshStandardMaterial({
  color: '#1e293b',
  roughness: 0.7,
  metalness: 0.4,
});

const ActiveGateModuleCard = memo(function ActiveGateModuleCard({
  mod,
}: {
  mod: BoardModuleSpec;
}) {
  const tex = useCanvasTexture(() => createActiveGateModuleTexture(mod), [mod]);
  const layout = getGateModuleLayout(mod);
  const gType = mod.type as ActiveGateModuleType;
  const planeGeo = mod.isDaughterModule ? SHARED_DAUGHTER_PLANE_GEO : SHARED_COL0_PLANE_GEO;

  return (
    <group name={`active-module-${mod.id}`}>
      {/* High-DPI 512×512 Silkscreen & IEEE Gate Symbols */}
      <mesh
        position={[mod.position.x, layout.surfaceY, mod.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={planeGeo}
      >
        <meshStandardMaterial map={tex} roughness={0.55} metalness={0.03} />
      </mesh>

      {/* DIP-14 IC mounted at TOP CENTER directly beneath the module title (click to inspect schematic & equation) */}
      <DipICChip
        position={[mod.position.x, layout.surfaceY, mod.position.z + layout.icLocalZ]}
        pinCount={14}
        label={ACTIVE_IC_CODES[gType]}
        length={1.62}
        width={layout.icWidth}
        onInspect={() => {
          const st = useSimulatorStore.getState();
          st.setInspectedIcType(gType);
          if (st.soundEnabled) playButtonSnap(true, false);
        }}
        onHoverChange={(hov) => {
          const st = useSimulatorStore.getState();
          st.setHoveredIcType(hov ? gType : null);
        }}
      />
    </group>
  );
});

/**
 * Renders Column 0's 5 built-in active logic blocks on the main PCB and Column 1's
 * active removable daughter card (XOR 7486 on brass standoffs), leaving standby bays black.
 */
export const LogicModulesGrid = memo(function LogicModulesGrid() {
  const activeGateModules = useMemo(
    () => ALL_MODULES.filter((m) => m.zone === 'center_grid' && m.status === 'active'),
    []
  );
  const activeDaughterCards = useMemo(
    () => activeGateModules.filter((m) => m.isDaughterModule),
    [activeGateModules]
  );

  const activeSlabRef = useRef<THREE.InstancedMesh>(null);
  const standoffRef = useRef<THREE.InstancedMesh>(null);
  const postRef = useRef<THREE.InstancedMesh>(null);
  const boreRef = useRef<THREE.InstancedMesh>(null);

  const totalCorners = activeDaughterCards.length * 4;

  useLayoutEffect(() => {
    if (activeDaughterCards.length === 0) return;

    const dummy = new THREE.Object3D();
    const slabY = BOARD_DIMENSIONS.daughterModule.pcbBottomY + DAUGHTER_T / 2;

    if (activeSlabRef.current) {
      activeDaughterCards.forEach((mod, idx) => {
        dummy.position.set(mod.position.x, slabY, mod.position.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        activeSlabRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      activeSlabRef.current.instanceMatrix.needsUpdate = true;
    }

    const standoffs = standoffRef.current;
    const posts = postRef.current;
    const bores = boreRef.current;
    if (!standoffs || !posts || !bores) return;

    const dx = DAUGHTER_W / 2 - 0.24;
    const dz = DAUGHTER_D / 2 - 0.24;
    let idx = 0;

    for (const mod of activeDaughterCards) {
      for (const sx of [-dx, dx]) {
        for (const sz of [-dz, dz]) {
          dummy.position.set(mod.position.x + sx, 0.026, mod.position.z + sz);
          dummy.rotation.set(0, Math.PI / 6, 0);
          dummy.updateMatrix();
          standoffs.setMatrixAt(idx, dummy.matrix);

          dummy.position.set(
            mod.position.x + sx,
            BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.021,
            mod.position.z + sz
          );
          dummy.updateMatrix();
          posts.setMatrixAt(idx, dummy.matrix);

          dummy.position.set(
            mod.position.x + sx,
            BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.022,
            mod.position.z + sz
          );
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          bores.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }

    standoffs.instanceMatrix.needsUpdate = true;
    posts.instanceMatrix.needsUpdate = true;
    bores.instanceMatrix.needsUpdate = true;
  }, [activeDaughterCards]);

  return (
    <group name="logic-modules-grid">
      {activeDaughterCards.length > 0 && (
        <>
          <instancedMesh
            ref={activeSlabRef}
            args={[SHARED_DAUGHTER_PCB_GEO, SHARED_ACTIVE_SLAB_MAT, activeDaughterCards.length]}
          />
          <instancedMesh
            ref={standoffRef}
            args={[SHARED_BRASS_STANDOFF_GEO, SHARED_BRASS_MAT, totalCorners]}
          />
          <instancedMesh
            ref={postRef}
            args={[SHARED_BRASS_POST_GEO, SHARED_BRASS_MAT, totalCorners]}
          />
          <instancedMesh
            ref={boreRef}
            args={[SHARED_BRASS_BORE_GEO, SHARED_BORE_MAT, totalCorners]}
          />
        </>
      )}

      {activeGateModules.map((mod) => (
        <ActiveGateModuleCard key={mod.id} mod={mod} />
      ))}

      <GateElectricityOverlay />
    </group>
  );
});
