import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BOARD_DIMENSIONS } from '../../schema/boardSchema';
import { createMainBoardTexture, useCanvasTexture } from '../textures/silkscreenGenerator';

/**
 * Main 440mm × 290mm × 4mm blue solder-mask PCB with top silkscreen plane,
 * protective dark-slate metallic perimeter bezel, bottom tray, and corner screws.
 */
export function BoardChassis() {
  const mainTex = useCanvasTexture(createMainBoardTexture, []);
  const screwRef = useRef<THREE.InstancedMesh>(null);
  const footRef = useRef<THREE.InstancedMesh>(null);

  const screwGeo = useMemo(() => new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), []);
  const screwMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.25,
        metalness: 0.88,
      }),
    []
  );
  const footGeo = useMemo(() => new THREE.CylinderGeometry(0.45, 0.52, 0.08, 16), []);
  const footMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#090d14',
        roughness: 0.9,
        metalness: 0.05,
      }),
    []
  );

  useEffect(() => {
    return () => {
      screwGeo.dispose();
      screwMat.dispose();
      footGeo.dispose();
      footMat.dispose();
    };
  }, [screwGeo, screwMat, footGeo, footMat]);

  const { width, depth, thickness } = BOARD_DIMENSIONS;
  const railThickness = 0.8;
  const bezelOuterW = width + railThickness * 2;
  const bezelOuterD = depth + railThickness * 2;

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const corners: Array<[number, number]> = [
      [-width / 2 - 0.38, -depth / 2 - 0.38],
      [width / 2 + 0.38, -depth / 2 - 0.38],
      [-width / 2 - 0.38, depth / 2 + 0.38],
      [width / 2 + 0.38, depth / 2 + 0.38],
    ];

    if (screwRef.current) {
      corners.forEach(([x, z], i) => {
        dummy.position.set(x, 0.075, z);
        dummy.updateMatrix();
        screwRef.current!.setMatrixAt(i, dummy.matrix);
      });
      screwRef.current.instanceMatrix.needsUpdate = true;
    }

    if (footRef.current) {
      corners.forEach(([x, z], i) => {
        dummy.position.set(x * 0.96, -0.54, z * 0.94);
        dummy.updateMatrix();
        footRef.current!.setMatrixAt(i, dummy.matrix);
      });
      footRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [width, depth]);

  return (
    <group name="board-chassis">
      {/* Main 44 × 0.4 × 29 PCB slab (top surface strictly at Y = 0.00) */}
      <mesh position={[0, -thickness / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#0a598c" roughness={0.5} metalness={0.08} />
      </mesh>

      {/* Main silkscreen top plane at Y = 0.004 */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={mainTex} roughness={0.42} metalness={0.05} />
      </mesh>

      {/* Protective metallic dark-slate perimeter bezel rails */}
      <group name="bezel-frame">
        {/* Top rail */}
        <mesh position={[0, -0.22, -depth / 2 - railThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[bezelOuterW, 0.56, railThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.38} metalness={0.6} />
        </mesh>
        {/* Bottom rail */}
        <mesh position={[0, -0.22, depth / 2 + railThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[bezelOuterW, 0.56, railThickness]} />
          <meshStandardMaterial color="#1e293b" roughness={0.38} metalness={0.6} />
        </mesh>
        {/* Left rail */}
        <mesh position={[-width / 2 - railThickness / 2, -0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[railThickness, 0.56, depth]} />
          <meshStandardMaterial color="#1e293b" roughness={0.38} metalness={0.6} />
        </mesh>
        {/* Right rail */}
        <mesh position={[width / 2 + railThickness / 2, -0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[railThickness, 0.56, depth]} />
          <meshStandardMaterial color="#1e293b" roughness={0.38} metalness={0.6} />
        </mesh>
        {/* Bottom chassis base plate */}
        <mesh position={[0, -0.45, 0]} receiveShadow castShadow>
          <boxGeometry args={[bezelOuterW - 0.2, 0.1, bezelOuterD - 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>

      {/* Corner screws & rubber feet */}
      <instancedMesh ref={screwRef} args={[screwGeo, screwMat, 4]} castShadow />
      <instancedMesh ref={footRef} args={[footGeo, footMat, 4]} castShadow />
    </group>
  );
}
