import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  ALL_MODULES,
  BOARD_DIMENSIONS,
  type ActiveGateModuleType,
  type BoardModuleSpec,
} from '../../schema/boardSchema';
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

const STANDBY_IC_SPECS: Record<string, { code: string; pins: 8 | 14 | 16; len: number; wid: number; twin?: boolean }> = {
  IC_7410: { code: 'SN74LS10N', pins: 14, len: 1.82, wid: 0.56 },
  IC_7420: { code: 'SN74LS20N', pins: 14, len: 1.82, wid: 0.56 },
  IC_7442: { code: 'SN74LS42N', pins: 16, len: 2.02, wid: 0.58 },
  IC_7447: { code: 'SN74LS47N', pins: 16, len: 2.02, wid: 0.58 },
  IC_7448: { code: 'SN74LS48N', pins: 16, len: 2.02, wid: 0.58 },
  IC_7473: { code: 'SN74LS73N', pins: 14, len: 1.82, wid: 0.56 },
  IC_7475: { code: 'SN74LS75N', pins: 16, len: 2.02, wid: 0.58 },
  IC_7483: { code: 'SN74LS83N', pins: 16, len: 2.02, wid: 0.58 },
  IC_7485: { code: 'SN74LS85N', pins: 16, len: 2.02, wid: 0.58 },
  IC_7490: { code: 'SN74LS90N', pins: 14, len: 1.82, wid: 0.56 },
  IC_74393: { code: 'SN74LS393', pins: 14, len: 1.82, wid: 0.56 },
  NE555: { code: 'NE555P', pins: 8, len: 1.05, wid: 0.56 },
  MV1: { code: 'CD4538', pins: 16, len: 1.92, wid: 0.58 },
  MV2: { code: 'SN74LS123', pins: 16, len: 1.92, wid: 0.58 },
};

function ActiveGateModuleCard({ mod }: { mod: BoardModuleSpec }) {
  const tex = useCanvasTexture(() => createActiveGateModuleTexture(mod), [mod]);
  const { width, depth, thickness, pcbBottomY, silkscreenY } = BOARD_DIMENSIONS.daughterModule;
  const gType = mod.type as ActiveGateModuleType;

  return (
    <group name={`active-module-${mod.id}`}>
      {/* Daughter PCB slab sitting on standoffs (Y = 0.05 to 0.20) */}
      <mesh
        position={[mod.position.x, pcbBottomY + thickness / 2, mod.position.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#0a598c" roughness={0.48} metalness={0.08} />
      </mesh>

      {/* High-DPI 512×512 Silkscreen & IEEE Gate Symbols at Y = 0.204 */}
      <mesh
        position={[mod.position.x, silkscreenY, mod.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={tex} roughness={0.42} metalness={0.04} />
      </mesh>

      {/* Realistic DIP-14 IC mounted along bottom strip clear of Gate 4 */}
      <DipICChip
        position={[mod.position.x, silkscreenY, mod.position.z + 2.01]}
        pinCount={14}
        label={ACTIVE_IC_CODES[gType]}
        length={1.62}
        width={0.44}
      />
    </group>
  );
}

function StandbyModuleCard({ mod }: { mod: BoardModuleSpec }) {
  const tex = useCanvasTexture(() => createStandbyModuleTexture(mod), [mod]);
  const { width, depth, thickness, pcbBottomY, silkscreenY } = BOARD_DIMENSIONS.daughterModule;
  const spec = STANDBY_IC_SPECS[mod.id] ?? { code: mod.shortLabel, pins: 14 as const, len: 1.82, wid: 0.56 };

  return (
    <group name={`standby-module-${mod.id}`}>
      {/* Slightly cooler/muted daughter PCB slab */}
      <mesh
        position={[mod.position.x, pcbBottomY + thickness / 2, mod.position.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#084770" roughness={0.55} metalness={0.08} />
      </mesh>

      {/* Standby Silkscreen plane */}
      <mesh
        position={[mod.position.x, silkscreenY, mod.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={tex} roughness={0.48} metalness={0.04} />
      </mesh>

      {/* Central Standby DIP IC */}
      <DipICChip
        position={[mod.position.x, silkscreenY, mod.position.z + 0.15]}
        pinCount={spec.pins}
        label={spec.code}
        length={spec.len}
        width={spec.wid}
        dimmed
      />
    </group>
  );
}

/**
 * Renders all 20 daughter PCBs in the 4×5 center module grid on brass corner standoffs.
 */
export function LogicModulesGrid() {
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
          z: m.position.z + 0.1,
          rows: 6,
          cols: 2,
          pitchZ: 0.54,
        },
        {
          key: `${m.id}-R`,
          x: m.position.x + 2.02,
          yBase: BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.001,
          yTop: BOARD_DIMENSIONS.daughterModule.headerTopY,
          z: m.position.z + 0.1,
          rows: 6,
          cols: 2,
          pitchZ: 0.54,
        }
      );
    }
    return list;
  }, [standbyModules]);

  const standoffRef = useRef<THREE.InstancedMesh>(null);
  const screwRef = useRef<THREE.InstancedMesh>(null);

  const standoffGeo = useMemo(() => new THREE.CylinderGeometry(0.11, 0.11, 0.048, 12), []);
  const standoffMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ca8a04',
        roughness: 0.25,
        metalness: 0.85,
      }),
    []
  );
  const screwGeo = useMemo(() => new THREE.CylinderGeometry(0.11, 0.11, 0.025, 12), []);
  const screwMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.22,
        metalness: 0.9,
      }),
    []
  );

  useEffect(() => {
    return () => {
      standoffGeo.dispose();
      standoffMat.dispose();
      screwGeo.dispose();
      screwMat.dispose();
    };
  }, [standoffGeo, standoffMat, screwGeo, screwMat]);

  const totalCorners = daughterModules.length * 4;

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const standoffs = standoffRef.current;
    const screws = screwRef.current;
    if (!standoffs || !screws) return;

    const dx = BOARD_DIMENSIONS.daughterModule.width / 2 - 0.26;
    const dz = BOARD_DIMENSIONS.daughterModule.depth / 2 - 0.26;
    let idx = 0;

    for (const mod of daughterModules) {
      for (const sx of [-dx, dx]) {
        for (const sz of [-dz, dz]) {
          dummy.position.set(mod.position.x + sx, 0.028, mod.position.z + sz);
          dummy.updateMatrix();
          standoffs.setMatrixAt(idx, dummy.matrix);

          dummy.position.set(
            mod.position.x + sx,
            BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.012,
            mod.position.z + sz
          );
          dummy.updateMatrix();
          screws.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
    }

    standoffs.instanceMatrix.needsUpdate = true;
    screws.instanceMatrix.needsUpdate = true;
  }, [daughterModules]);

  return (
    <group name="logic-modules-grid">
      {activeModules.map((mod) => (
        <ActiveGateModuleCard key={mod.id} mod={mod} />
      ))}

      {standbyModules.map((mod) => (
        <StandbyModuleCard key={mod.id} mod={mod} />
      ))}

      <StandbyHeaderBank strips={standbyStrips} />

      <instancedMesh ref={standoffRef} args={[standoffGeo, standoffMat, totalCorners]} castShadow />
      <instancedMesh ref={screwRef} args={[screwGeo, screwMat, totalCorners]} castShadow />
    </group>
  );
}
