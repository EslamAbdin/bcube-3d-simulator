import { memo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { createIcTopTexture, useCanvasTexture } from '../textures/silkscreenGenerator';

export interface DipICChipProps {
  position: [number, number, number];
  label: string;
  pinCount?: 8 | 14 | 16;
  length?: number;
  width?: number;
  height?: number;
  dimmed?: boolean;
  castShadow?: boolean;
}

const SHARED_SHOULDER_GEO = new THREE.BoxGeometry(0.055, 0.025, 0.09);
const SHARED_LEG_GEO = new THREE.BoxGeometry(0.055, 0.16, 0.032);
const SHARED_NOTCH_GEO = new THREE.CylinderGeometry(0.075, 0.075, 0.012, 16);
const SHARED_NOTCH_MAT = new THREE.MeshStandardMaterial({ color: '#0b0f17', roughness: 0.8 });
const SHARED_PIN_MAT_ACTIVE = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  roughness: 0.25,
  metalness: 0.85,
});
const SHARED_PIN_MAT_DIMMED = new THREE.MeshStandardMaterial({
  color: '#94a3b8',
  roughness: 0.25,
  metalness: 0.85,
});
const SHARED_BODY_MAT_ACTIVE = new THREE.MeshStandardMaterial({
  color: '#181c24',
  roughness: 0.58,
  metalness: 0.12,
});
const SHARED_BODY_MAT_DIMMED = new THREE.MeshStandardMaterial({
  color: '#1f2633',
  roughness: 0.58,
  metalness: 0.12,
});

/**
 * Procedural DIP-8 / DIP-14 / DIP-16 matte-black IC package with metallic pins
 * and laser-etched part code. Local Y = 0 sits flush on the PCB top surface.
 */
export const DipICChip = memo(function DipICChip({
  position,
  label,
  pinCount = 14,
  length = 1.62,
  width = 0.44,
  height = 0.22,
  dimmed = false,
  castShadow = true,
}: DipICChipProps) {
  const pinsPerSide = pinCount / 2;
  const shoulderRef = useRef<THREE.InstancedMesh>(null);
  const legRef = useRef<THREE.InstancedMesh>(null);

  const topTex = useCanvasTexture(() => createIcTopTexture(label), [label]);
  const pinMat = dimmed ? SHARED_PIN_MAT_DIMMED : SHARED_PIN_MAT_ACTIVE;
  const bodyMat = dimmed ? SHARED_BODY_MAT_DIMMED : SHARED_BODY_MAT_ACTIVE;

  useLayoutEffect(() => {
    const shoulderMesh = shoulderRef.current;
    const legMesh = legRef.current;
    if (!shoulderMesh || !legMesh) return;

    const dummy = new THREE.Object3D();
    const spanX = length * 0.82;
    const stepX = pinsPerSide > 1 ? spanX / (pinsPerSide - 1) : 0;
    const startX = -spanX / 2;
    let idx = 0;

    for (const side of [-1, 1]) {
      for (let i = 0; i < pinsPerSide; i++) {
        const px = startX + i * stepX;
        const sz = side * (width / 2 + 0.035);
        const lz = side * (width / 2 + 0.068);

        dummy.position.set(px, 0.145, sz);
        dummy.updateMatrix();
        shoulderMesh.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(px, 0.075, lz);
        dummy.updateMatrix();
        legMesh.setMatrixAt(idx, dummy.matrix);

        idx++;
      }
    }

    shoulderMesh.instanceMatrix.needsUpdate = true;
    legMesh.instanceMatrix.needsUpdate = true;
  }, [length, width, pinsPerSide]);

  const bodyCenterY = 0.04 + height / 2;
  const bodyTopY = 0.04 + height;

  return (
    <group position={position} name={`dip-ic-${label}`}>
      {/* Matte black epoxy body */}
      <mesh position={[0, bodyCenterY, 0]} material={bodyMat} castShadow={castShadow} receiveShadow={castShadow}>
        <boxGeometry args={[length, height, width]} />
      </mesh>

      {/* Left-side orientation notch */}
      <mesh
        position={[-length / 2 + 0.045, bodyTopY + 0.001, 0]}
        geometry={SHARED_NOTCH_GEO}
        material={SHARED_NOTCH_MAT}
      />

      {/* Top laser-etched IC code */}
      <mesh position={[0, bodyTopY + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length * 0.88, width * 0.84]} />
        <meshStandardMaterial map={topTex} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Metallic side pins (omit tiny pin shadow-map passes to save 40+ draw calls) */}
      <instancedMesh ref={shoulderRef} args={[SHARED_SHOULDER_GEO, pinMat, pinCount]} />
      <instancedMesh ref={legRef} args={[SHARED_LEG_GEO, pinMat, pinCount]} />
    </group>
  );
});
