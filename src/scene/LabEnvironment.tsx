import { memo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useSimulatorStore } from '../store/useSimulatorStore';

/**
 * Studio workbench lighting & shadow manager:
 * - HQ mode: soft 1024×1024 PCF shadow map with anti-acne bias
 * - Eco mode: shadows disabled dynamically without WebGL context loss
 */
export const LabEnvironment = memo(function LabEnvironment() {
  const isHighPerf = useSimulatorStore((s) => s.performanceMode === 'high');
  const { gl, invalidate } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = isHighPerf;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, isHighPerf, invalidate]);

  return (
    <group name="lab-environment">
      <color attach="background" args={['#070b14']} />

      {/* Dark matte laboratory desk */}
      <mesh position={[0, -0.605, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[180, 140]} />
        <meshLambertMaterial color="#0e1525" />
      </mesh>

      {/* Subtle ESD work-mat beneath the bCube unit (>= 0.025 clearance above desk) */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[52, 36]} />
        <meshLambertMaterial
          color="#131d31"
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Crisp 3-point educational lighting */}
      <ambientLight intensity={0.68} />
      <hemisphereLight args={['#f0f9ff', '#1e293b', 0.72]} />
      <directionalLight
        position={[14, 34, 20]}
        intensity={1.1}
        castShadow={isHighPerf}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={5}
        shadow-camera-far={90}
      />
      <directionalLight position={[-18, 22, -16]} intensity={0.48} color="#bfdbfe" />
    </group>
  );
});
