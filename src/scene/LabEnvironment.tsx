import { memo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useSimulatorStore } from '../store/useSimulatorStore';

/**
 * Studio laboratory environment: dark matte workbench surface, ESD mat,
 * and balanced 3-point lighting with performance-aware soft shadows.
 */
export const LabEnvironment = memo(function LabEnvironment() {
  const isHighPerf = useSimulatorStore((s) => s.performanceMode === 'high');
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    gl.shadowMap.enabled = isHighPerf;
    gl.shadowMap.needsUpdate = true;
  }, [gl, isHighPerf]);

  return (
    <group name="lab-environment">
      <color attach="background" args={['#090e1a']} />

      {/* Dark matte laboratory desk */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={isHighPerf}>
        <planeGeometry args={[180, 140]} />
        <meshStandardMaterial color="#111827" roughness={0.88} metalness={0.08} />
      </mesh>

      {/* Subtle ESD work-mat beneath the bCube unit */}
      <mesh position={[0, -0.576, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={isHighPerf}>
        <planeGeometry args={[52, 36]} />
        <meshStandardMaterial color="#162032" roughness={0.82} metalness={0.06} />
      </mesh>

      {/* 3-Point Studio Lighting */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#e0f2fe', '#0f172a', 0.65]} />

      {/* Angled Key Light with Soft Shadows */}
      <directionalLight
        position={[18, 36, 22]}
        intensity={1.55}
        castShadow={isHighPerf}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={5}
        shadow-camera-far={95}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Cool Rim / Fill Light */}
      <directionalLight position={[-22, 22, -18]} intensity={0.5} color="#bfdbfe" />
    </group>
  );
});
