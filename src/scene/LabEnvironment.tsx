import { memo } from 'react';

/**
 * Shadow-free studio workbench environment optimized for 60 FPS on phones & laptops
 * with crisp, even illumination for educational board readability.
 */
export const LabEnvironment = memo(function LabEnvironment() {
  return (
    <group name="lab-environment">
      <color attach="background" args={['#070b14']} />

      {/* Dark matte laboratory desk */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 140]} />
        <meshLambertMaterial color="#0e1525" />
      </mesh>

      {/* Subtle ESD work-mat beneath the bCube unit */}
      <mesh position={[0, -0.576, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[52, 36]} />
        <meshLambertMaterial color="#131d31" />
      </mesh>

      {/* Crisp shadow-free 3-point educational lighting */}
      <ambientLight intensity={0.68} />
      <hemisphereLight args={['#f0f9ff', '#1e293b', 0.72]} />
      <directionalLight position={[14, 34, 20]} intensity={1.1} />
      <directionalLight position={[-18, 22, -16]} intensity={0.48} color="#bfdbfe" />
    </group>
  );
});
