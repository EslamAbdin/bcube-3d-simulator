import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  ALL_MODULES,
  BOARD_DIMENSIONS,
  type ActiveGateModuleType,
  type BoardModuleSpec,
} from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import {
  createActiveGateModuleTexture,
  createStandbyModuleTexture,
  useCanvasTexture,
} from '../textures/silkscreenGenerator';
import { DipICChip } from './DipICChip';
import { StandbyHeaderBank, type StandbyHeaderStripSpec } from './WhitePinHeader';

const ACTIVE_IC_CODES: Record<ActiveGateModuleType, string> = {
  IC_7400: 'SN74LS00N',
  IC_7402: 'SN74LS02N',
  IC_7404: 'SN74LS04N',
  IC_7408: 'SN74LS08N',
  IC_7432: 'SN74LS32N',
  IC_7486: 'SN74LS86N',
};

const STANDBY_IC_SPECS: Record<string, { code: string; pins: 8 | 14 | 16; len: number; wid: number }> = {
  IC_7410: { code: 'SN74LS10N', pins: 14, len: 1.82, wid: 0.46 },
  IC_7420: { code: 'SN74LS20N', pins: 14, len: 1.82, wid: 0.46 },
  IC_7442: { code: 'SN74LS42N', pins: 16, len: 1.96, wid: 0.48 },
  IC_7447: { code: 'SN74LS47N', pins: 16, len: 1.96, wid: 0.48 },
  IC_7448: { code: 'SN74LS48N', pins: 16, len: 1.96, wid: 0.48 },
  IC_7473: { code: 'SN74LS73N', pins: 14, len: 1.82, wid: 0.46 },
  IC_7475: { code: 'SN74LS75N', pins: 16, len: 1.96, wid: 0.48 },
  IC_7483: { code: 'SN74LS83N', pins: 16, len: 1.96, wid: 0.48 },
  IC_7485: { code: 'SN74LS85N', pins: 16, len: 1.96, wid: 0.48 },
  IC_7490: { code: 'SN74LS90N', pins: 14, len: 1.82, wid: 0.46 },
  IC_74393: { code: 'SN74LS393', pins: 14, len: 1.82, wid: 0.46 },
  NE555: { code: 'NE555P', pins: 8, len: 1.05, wid: 0.46 },
  MV1: { code: 'CD4538', pins: 16, len: 1.92, wid: 0.48 },
  MV2: { code: 'SN74LS123', pins: 16, len: 1.92, wid: 0.48 },
};

const { width: DAUGHTER_W, depth: DAUGHTER_D, thickness: DAUGHTER_T } = BOARD_DIMENSIONS.daughterModule;

const SHARED_DAUGHTER_PCB_GEO = new THREE.BoxGeometry(DAUGHTER_W, DAUGHTER_T, DAUGHTER_D);
const SHARED_DAUGHTER_PLANE_GEO = new THREE.PlaneGeometry(DAUGHTER_W, DAUGHTER_D);
const SHARED_ACTIVE_SLAB_MAT = new THREE.MeshStandardMaterial({
  color: '#0a598c',
  roughness: 0.55,
  metalness: 0.06,
});
const SHARED_STANDBY_SLAB_MAT = new THREE.MeshStandardMaterial({
  color: '#084770',
  roughness: 0.58,
  metalness: 0.06,
});

// 6-sided authentic brass hex standoffs & top corner mounting posts
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
  castShadow,
}: {
  mod: BoardModuleSpec;
  castShadow: boolean;
}) {
  const tex = useCanvasTexture(() => createActiveGateModuleTexture(mod), [mod]);
  const { silkscreenY } = BOARD_DIMENSIONS.daughterModule;
  const gType = mod.type as ActiveGateModuleType;

  return (
    <group name={`active-module-${mod.id}`}>
      {/* High-DPI 512×512 Silkscreen & IEEE Gate Symbols at Y = 0.204 (slab instanced at grid level) */}
      <mesh
        position={[mod.position.x, silkscreenY, mod.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_DAUGHTER_PLANE_GEO}
        receiveShadow={castShadow}
      >
        <meshStandardMaterial map={tex} roughness={0.55} metalness={0.03} />
      </mesh>

      {/* DIP-14 IC mounted at TOP CENTER directly beneath the module title */}
      <DipICChip
        position={[mod.position.x, silkscreenY, mod.position.z - 1.56]}
        pinCount={14}
        label={ACTIVE_IC_CODES[gType]}
        length={1.62}
        width={0.44}
        castShadow={castShadow}
      />
    </group>
  );
});

const StandbyModuleCard = memo(function StandbyModuleCard({
  mod,
  castShadow,
}: {
  mod: BoardModuleSpec;
  castShadow: boolean;
}) {
  const tex = useCanvasTexture(() => createStandbyModuleTexture(mod), [mod]);
  const { silkscreenY } = BOARD_DIMENSIONS.daughterModule;
  const spec = STANDBY_IC_SPECS[mod.id] ?? { code: mod.shortLabel, pins: 14 as const, len: 1.82, wid: 0.46 };

  return (
    <group name={`standby-module-${mod.id}`}>
      {/* Standby Silkscreen plane (slab instanced at grid level) */}
      <mesh
        position={[mod.position.x, silkscreenY, mod.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_DAUGHTER_PLANE_GEO}
        receiveShadow={castShadow}
      >
        <meshStandardMaterial map={tex} roughness={0.58} metalness={0.03} />
      </mesh>

      {/* Top-Center Standby DIP IC matching real bCube hardware */}
      <DipICChip
        position={[mod.position.x, silkscreenY, mod.position.z - 1.38]}
        pinCount={spec.pins}
        label={spec.code}
        length={spec.len}
        width={spec.wid}
        dimmed
        castShadow={castShadow}
      />
    </group>
  );
});

/**
 * Renders all 20 daughter PCBs in the 4×5 center module grid on brass hex corner standoffs.
 */
export const LogicModulesGrid = memo(function LogicModulesGrid() {
  const isHighPerf = useSimulatorStore((s) => s.performanceMode === 'high');

  const daughterModules = useMemo(
    () => ALL_MODULES.filter((m) => m.isDaughterModule),
    []
  );

  const standbyModules = useMemo(
    () => daughterModules.filter((m) => m.status === 'standby'),
    [daughterModules]
  );

  const activeModules = useMemo(
    () => daughterModules.filter((m) => m.status === 'active'),
    [daughterModules]
  );

  const standbyStrips = useMemo<StandbyHeaderStripSpec[]>(() => {
    const list: StandbyHeaderStripSpec[] = [];
    for (const m of standbyModules) {
      list.push(
        {
          key: `${m.id}-L`,
          x: m.position.x - 2.02,
          yBase: BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.001,
          yTop: BOARD_DIMENSIONS.daughterModule.headerTopY,
          z: m.position.z + 0.48,
          rows: 5,
          cols: 2,
          pitchZ: 0.5,
        },
        {
          key: `${m.id}-R`,
          x: m.position.x + 2.02,
          yBase: BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.001,
          yTop: BOARD_DIMENSIONS.daughterModule.headerTopY,
          z: m.position.z + 0.48,
          rows: 5,
          cols: 2,
          pitchZ: 0.5,
        }
      );
    }
    return list;
  }, [standbyModules]);

  const activeSlabRef = useRef<THREE.InstancedMesh>(null);
  const standbySlabRef = useRef<THREE.InstancedMesh>(null);
  const standoffRef = useRef<THREE.InstancedMesh>(null);
  const postRef = useRef<THREE.InstancedMesh>(null);
  const boreRef = useRef<THREE.InstancedMesh>(null);

  const totalCorners = daughterModules.length * 4;

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const slabY = BOARD_DIMENSIONS.daughterModule.pcbBottomY + DAUGHTER_T / 2;

    if (activeSlabRef.current) {
      activeModules.forEach((mod, idx) => {
        dummy.position.set(mod.position.x, slabY, mod.position.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        activeSlabRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      activeSlabRef.current.instanceMatrix.needsUpdate = true;
    }

    if (standbySlabRef.current) {
      standbyModules.forEach((mod, idx) => {
        dummy.position.set(mod.position.x, slabY, mod.position.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        standbySlabRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      standbySlabRef.current.instanceMatrix.needsUpdate = true;
    }

    const standoffs = standoffRef.current;
    const posts = postRef.current;
    const bores = boreRef.current;
    if (!standoffs || !posts || !bores) return;

    const dx = DAUGHTER_W / 2 - 0.24;
    const dz = DAUGHTER_D / 2 - 0.24;
    let idx = 0;

    for (const mod of daughterModules) {
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
  }, [daughterModules, activeModules, standbyModules]);

  return (
    <group name="logic-modules-grid">
      <instancedMesh
        ref={activeSlabRef}
        args={[SHARED_DAUGHTER_PCB_GEO, SHARED_ACTIVE_SLAB_MAT, activeModules.length]}
        castShadow={isHighPerf}
        receiveShadow={isHighPerf}
      />
      <instancedMesh
        ref={standbySlabRef}
        args={[SHARED_DAUGHTER_PCB_GEO, SHARED_STANDBY_SLAB_MAT, standbyModules.length]}
        castShadow={isHighPerf}
        receiveShadow={isHighPerf}
      />

      {activeModules.map((mod) => (
        <ActiveGateModuleCard key={mod.id} mod={mod} castShadow={isHighPerf} />
      ))}

      {standbyModules.map((mod) => (
        <StandbyModuleCard key={mod.id} mod={mod} castShadow={isHighPerf} />
      ))}

      <StandbyHeaderBank strips={standbyStrips} />

      <instancedMesh
        ref={standoffRef}
        args={[SHARED_BRASS_STANDOFF_GEO, SHARED_BRASS_MAT, totalCorners]}
        castShadow={isHighPerf}
      />
      <instancedMesh
        ref={postRef}
        args={[SHARED_BRASS_POST_GEO, SHARED_BRASS_MAT, totalCorners]}
        castShadow={isHighPerf}
      />
      <instancedMesh ref={boreRef} args={[SHARED_BRASS_BORE_GEO, SHARED_BORE_MAT, totalCorners]} />
    </group>
  );
});
