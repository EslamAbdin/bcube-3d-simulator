import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ALL_SOCKETS, BOARD_DIMENSIONS } from '../../schema/boardSchema';

interface HeaderHousing {
  key: string;
  x: number;
  yBase: number;
  yTop: number;
  zCenter: number;
  width: number;
  depth: number;
}

interface DualHoleRow {
  nodeId: string;
  moduleId: string;
  centerX: number;
  y: number;
  z: number;
}

function buildHeaderHousings(): HeaderHousing[] {
  // Collapse dual-hole pairs sharing nodeId into physical rows
  const rowMap = new Map<string, DualHoleRow>();
  for (const s of ALL_SOCKETS) {
    const existing = rowMap.get(s.nodeId);
    if (!existing) {
      rowMap.set(s.nodeId, {
        nodeId: s.nodeId,
        moduleId: s.moduleId,
        centerX: s.position.x,
        y: s.position.y,
        z: s.position.z,
      });
    } else {
      existing.centerX = (existing.centerX + s.position.x) / 2;
    }
  }

  // Group rows by (moduleId, column X)
  const columns = new Map<string, DualHoleRow[]>();
  for (const row of rowMap.values()) {
    const colKey = `${row.moduleId}:${row.centerX.toFixed(2)}`;
    const list = columns.get(colKey) ?? [];
    list.push(row);
    columns.set(colKey, list);
  }

  const housings: HeaderHousing[] = [];
  const housingWidth = BOARD_DIMENSIONS.dualHolePitch + 0.3;

  for (const [colKey, rows] of columns.entries()) {
    rows.sort((a, b) => a.z - b.z);
    let cluster: DualHoleRow[] = [];

    const flushCluster = (idx: number) => {
      if (cluster.length === 0) return;
      const zMin = cluster[0].z;
      const zMax = cluster[cluster.length - 1].z;
      const yTop = cluster[0].y;
      const yBase = yTop > 0.3 ? BOARD_DIMENSIONS.daughterModule.silkscreenY + 0.001 : 0.005;
      housings.push({
        key: `${colKey}#${idx}`,
        x: cluster[0].centerX,
        yBase,
        yTop,
        zCenter: (zMin + zMax) / 2,
        width: housingWidth,
        depth: zMax - zMin + 0.34,
      });
      cluster = [];
    };

    let clusterIndex = 0;
    for (const r of rows) {
      if (cluster.length > 0 && r.z - cluster[cluster.length - 1].z > 0.95) {
        flushCluster(clusterIndex++);
      }
      cluster.push(r);
    }
    flushCluster(clusterIndex);
  }

  return housings;
}

const SHARED_UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const SHARED_ACTIVE_CAVITY_GEO = new THREE.BoxGeometry(0.13, 0.008, 0.13);
const SHARED_ACTIVE_PIN_GEO = new THREE.BoxGeometry(0.045, 0.004, 0.045);
const SHARED_PLASTIC_MAT = new THREE.MeshStandardMaterial({
  color: '#eef2f6',
  roughness: 0.42,
  metalness: 0.04,
});
const SHARED_RIM_MAT = new THREE.MeshStandardMaterial({
  color: '#dbe4ef',
  roughness: 0.5,
  metalness: 0.05,
});
const SHARED_CAVITY_MAT = new THREE.MeshStandardMaterial({
  color: '#0f172a',
  roughness: 0.85,
  metalness: 0.1,
});
const SHARED_CONTACT_PIN_MAT = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  roughness: 0.25,
  metalness: 0.85,
});
const SHARED_STANDBY_CAVITY_GEO = new THREE.BoxGeometry(0.11, 0.008, 0.11);
const SHARED_STANDBY_STRIP_MAT = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  roughness: 0.46,
  metalness: 0.04,
});

/**
 * Renders all active v1 white dual-hole female headers from ALL_SOCKETS
 * using instanced housings, rims, socket cavities, and metallic contact pins.
 */
export const ActiveSocketHeaders = memo(function ActiveSocketHeaders() {
  const housings = useMemo(() => buildHeaderHousings(), []);

  const housingMeshRef = useRef<THREE.InstancedMesh>(null);
  const rimMeshRef = useRef<THREE.InstancedMesh>(null);
  const cavityMeshRef = useRef<THREE.InstancedMesh>(null);
  const pinMeshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const housingMesh = housingMeshRef.current;
    const rimMesh = rimMeshRef.current;
    if (housingMesh && rimMesh) {
      housings.forEach((h, idx) => {
        const height = h.yTop - h.yBase;
        const cy = h.yBase + height / 2;

        dummy.position.set(h.x, cy, h.zCenter);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(h.width, height, h.depth);
        dummy.updateMatrix();
        housingMesh.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(h.x, cy + height / 2 - 0.012, h.zCenter);
        dummy.scale.set(h.width + 0.03, 0.024, h.depth + 0.03);
        dummy.updateMatrix();
        rimMesh.setMatrixAt(idx, dummy.matrix);
      });
      housingMesh.instanceMatrix.needsUpdate = true;
      rimMesh.instanceMatrix.needsUpdate = true;
    }

    const cavityMesh = cavityMeshRef.current;
    const pinMesh = pinMeshRef.current;
    if (!cavityMesh || !pinMesh) return;

    dummy.scale.set(1, 1, 1);
    ALL_SOCKETS.forEach((s, idx) => {
      dummy.position.set(s.position.x, s.position.y - 0.001, s.position.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      cavityMesh.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(s.position.x, s.position.y + 0.0035, s.position.z);
      dummy.updateMatrix();
      pinMesh.setMatrixAt(idx, dummy.matrix);
    });

    cavityMesh.instanceMatrix.needsUpdate = true;
    pinMesh.instanceMatrix.needsUpdate = true;
  }, [housings]);

  return (
    <group name="active-socket-headers">
      <instancedMesh
        ref={housingMeshRef}
        args={[SHARED_UNIT_BOX_GEO, SHARED_PLASTIC_MAT, housings.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={rimMeshRef}
        args={[SHARED_UNIT_BOX_GEO, SHARED_RIM_MAT, housings.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={cavityMeshRef}
        args={[SHARED_ACTIVE_CAVITY_GEO, SHARED_CAVITY_MAT, ALL_SOCKETS.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={pinMeshRef}
        args={[SHARED_ACTIVE_PIN_GEO, SHARED_CONTACT_PIN_MAT, ALL_SOCKETS.length]}
        frustumCulled={false}
      />
    </group>
  );
});

export interface StandbyHeaderStripSpec {
  key: string;
  x: number;
  yBase: number;
  yTop: number;
  z: number;
  rows: number;
  cols: number;
  pitchZ?: number;
  pitchX?: number;
  horizontal?: boolean;
  color?: string;
}

/**
 * Renders decorative white/shrouded standby pin headers with instanced housings and cavities.
 */
export const StandbyHeaderBank = memo(function StandbyHeaderBank({
  strips,
}: {
  strips: StandbyHeaderStripSpec[];
}) {
  const stripMeshRef = useRef<THREE.InstancedMesh>(null);
  const cavityMeshRef = useRef<THREE.InstancedMesh>(null);

  const cavityPositions = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (const s of strips) {
      const pX = s.pitchX ?? BOARD_DIMENSIONS.dualHolePitch;
      const pZ = s.pitchZ ?? 0.44;
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
          const offsetX = (c - (s.cols - 1) / 2) * pX;
          const offsetZ = (r - (s.rows - 1) / 2) * pZ;
          pts.push([s.x + offsetX, s.yTop - 0.001, s.z + offsetZ]);
        }
      }
    }
    return pts;
  }, [strips]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const stripMesh = stripMeshRef.current;
    if (stripMesh) {
      const color = new THREE.Color();
      strips.forEach((s, idx) => {
        const pX = s.pitchX ?? BOARD_DIMENSIONS.dualHolePitch;
        const pZ = s.pitchZ ?? 0.44;
        const width = (s.cols - 1) * pX + 0.28;
        const depth = (s.rows - 1) * pZ + 0.34;
        const height = s.yTop - s.yBase;

        dummy.position.set(s.x, s.yBase + height / 2, s.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        stripMesh.setMatrixAt(idx, dummy.matrix);
        stripMesh.setColorAt(idx, color.set(s.color ?? '#dfe6ee'));
      });
      stripMesh.instanceMatrix.needsUpdate = true;
      if (stripMesh.instanceColor) stripMesh.instanceColor.needsUpdate = true;
    }

    const mesh = cavityMeshRef.current;
    if (!mesh) return;
    dummy.scale.set(1, 1, 1);
    cavityPositions.forEach(([x, y, z], idx) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [strips, cavityPositions]);

  return (
    <group name="standby-header-bank">
      {strips.length > 0 && (
        <instancedMesh
          ref={stripMeshRef}
          args={[SHARED_UNIT_BOX_GEO, SHARED_STANDBY_STRIP_MAT, strips.length]}
          frustumCulled={false}
        />
      )}

      {cavityPositions.length > 0 && (
        <instancedMesh
          ref={cavityMeshRef}
          args={[SHARED_STANDBY_CAVITY_GEO, SHARED_CAVITY_MAT, cavityPositions.length]}
          frustumCulled={false}
        />
      )}
    </group>
  );
});
