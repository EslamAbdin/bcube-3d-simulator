import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
}

/**
 * Procedural DIP-8 / DIP-14 / DIP-16 matte-black IC package with metallic pins
 * and laser-etched part code. Local Y = 0 sits flush on the PCB top surface.
 */
export function DipICChip({
  position,
  label,
  pinCount = 14,
  length = 1.62,
  width = 0.44,
  height = 0.22,
  dimmed = false,
}: DipICChipProps) {
  const pinsPerSide = pinCount / 2;
  const shoulderRef = useRef<THREE.InstancedMesh>(null);
  const legRef = useRef<THREE.InstancedMesh>(null);

  const topTex = useCanvasTexture(() => createIcTopTexture(label), [label]);

  const shoulderGeo = useMemo(() => new THREE.BoxGeometry(0.055, 0.025, 0.09), []);
  const legGeo = useMemo(() => new THREE.BoxGeometry(0.055, 0.16, 0.032), []);
  const pinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: dimmed ? '#94a3b8' : '#cbd5e1',
        roughness: 0.25,
        metalness: 0.85,
      }),
    [dimmed]
  );

  useEffect(() => {
    return () => {
      shoulderGeo.dispose();
      legGeo.dispose();
      pinMat.dispose();
    };
  }, [shoulderGeo, legGeo, pinMat]);

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
      <mesh position={[0, bodyCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          color={dimmed ? '#1f2633' : '#181c24'}
          roughness={0.58}
          metalness={0.12}
        />
      </mesh>

      {/* Left-side orientation notch */}
      <mesh position={[-length / 2 + 0.045, bodyTopY + 0.001, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.012, 16]} />
        <meshStandardMaterial color="#0b0f17" roughness={0.8} />
      </mesh>

      {/* Top laser-etched IC code */}
      <mesh position={[0, bodyTopY + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length * 0.88, width * 0.84]} />
        <meshStandardMaterial map={topTex} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Metallic side pins */}
      <instancedMesh ref={shoulderRef} args={[shoulderGeo, pinMat, pinCount]} castShadow />
      <instancedMesh ref={legRef} args={[legGeo, pinMat, pinCount]} castShadow />
    </group>
  );
}
