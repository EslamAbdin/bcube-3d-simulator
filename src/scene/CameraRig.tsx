import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulatorStore } from '../store/useSimulatorStore';

const PRESET_3D_POS = new THREE.Vector3(0, 34, 35);
const PRESET_3D_TARGET = new THREE.Vector3(0, 0, 0.5);

const PRESET_2D_POS = new THREE.Vector3(0, 52, 0.01);
const PRESET_2D_TARGET = new THREE.Vector3(0, 0, 0);

/**
 * Dual Camera Controller ('3d' Free Orbit vs '2d' Overhead Wiring View).
 * Keyboard shortcuts: V toggles view mode; R resets camera framing.
 */
export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);
  const cameraResetCount = useSimulatorStore((s) => s.cameraResetCount);
  const triggerCameraReset = useSimulatorStore((s) => s.triggerCameraReset);

  const isTransitioningRef = useRef(false);
  const goalPosRef = useRef(PRESET_3D_POS.clone());
  const goalTargetRef = useRef(PRESET_3D_TARGET.clone());
  const hasMountedRef = useRef(false);

  // Trigger smooth camera transition when mode changes or Reset is pressed
  useEffect(() => {
    const nextPos = cameraMode === '2d' ? PRESET_2D_POS : PRESET_3D_POS;
    const nextTarget = cameraMode === '2d' ? PRESET_2D_TARGET : PRESET_3D_TARGET;
    goalPosRef.current.copy(nextPos);
    goalTargetRef.current.copy(nextTarget);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      camera.position.copy(nextPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(nextTarget);
        controlsRef.current.update();
      }
      isTransitioningRef.current = false;
      return;
    }

    isTransitioningRef.current = true;
  }, [camera, cameraMode, cameraResetCount]);

  // Global keyboard shortcuts: V (toggle 3D/2D), R (reset framing)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'v') {
        const current = useSimulatorStore.getState().cameraMode;
        setCameraMode(current === '3d' ? '2d' : '3d');
      } else if (key === 'r') {
        triggerCameraReset();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCameraMode, triggerCameraReset]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current || !controlsRef.current) return;

    const alpha = 1 - Math.exp(-8 * Math.min(delta, 0.05));
    camera.position.lerp(goalPosRef.current, alpha);
    controlsRef.current.target.lerp(goalTargetRef.current, alpha);
    controlsRef.current.update();

    const posDist = camera.position.distanceTo(goalPosRef.current);
    const tgtDist = controlsRef.current.target.distanceTo(goalTargetRef.current);
    if (posDist < 0.04 && tgtDist < 0.04) {
      camera.position.copy(goalPosRef.current);
      controlsRef.current.target.copy(goalTargetRef.current);
      controlsRef.current.update();
      isTransitioningRef.current = false;
    }
  });

  const mouseButtons = useMemo(
    () => ({
      LEFT: cameraMode === '2d' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    }),
    [cameraMode]
  );

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableZoom
      enableRotate={cameraMode === '3d'}
      minDistance={7}
      maxDistance={85}
      minPolarAngle={cameraMode === '2d' ? 0 : 0.05}
      maxPolarAngle={cameraMode === '2d' ? 0.05 : Math.PI / 2.25}
      mouseButtons={mouseButtons}
      onStart={() => {
        isTransitioningRef.current = false;
      }}
    />
  );
}
