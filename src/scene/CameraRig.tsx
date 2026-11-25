import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SOCKET_MAP } from '../schema/boardSchema';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { touchWiringBridge } from './touchWiringBridge';

const PRESET_3D_TARGET = new THREE.Vector3(0, 0, 0.5);
const PRESET_2D_TARGET = new THREE.Vector3(0, 0, 0);

function getAspectScale(width: number, height: number): number {
  const aspect = width / Math.max(height, 1);
  if (aspect >= 1.25) return 1;
  // Scale distance inversely with narrow portrait aspect so all 45.6 units of board width stay visible
  return Math.min(4.2, 1.56 / Math.max(aspect, 0.35));
}

/**
 * Dual Camera Controller ('3d' Free Orbit vs '2d' Overhead Wiring View).
 * Desktop keeps Left-drag Orbit/Pan; Touch uses strict 2-finger camera/zoom
 * so 1-finger gestures are reserved exclusively for interacting & wiring.
 */
export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, gl, size, invalidate } = useThree();

  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);
  const cameraResetCount = useSimulatorStore((s) => s.cameraResetCount);
  const triggerCameraReset = useSimulatorStore((s) => s.triggerCameraReset);
  const touchTwoFingerMode = useSimulatorStore((s) => s.touchTwoFingerMode);

  const isTransitioningRef = useRef(false);
  const goalPosRef = useRef(new THREE.Vector3(0, 34, 35));
  const goalTargetRef = useRef(PRESET_3D_TARGET.clone());
  const hasMountedRef = useRef(false);

  const aspectScale = getAspectScale(size.width, size.height);

  // Trigger smooth camera transition when mode changes, reset is pressed, or aspect switches
  useEffect(() => {
    const nextPos =
      cameraMode === '2d'
        ? new THREE.Vector3(0, 52 * aspectScale, 0.01)
        : new THREE.Vector3(0, 34 * aspectScale, 35 * aspectScale);
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
      invalidate();
      return;
    }

    isTransitioningRef.current = true;
    invalidate();
  }, [camera, cameraMode, cameraResetCount, aspectScale, invalidate]);

  // Global touch pointer tracker: cancel any active drag wire if a 2nd finger lands
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touchWiringBridge.activeTouchIds.add(e.pointerId);
      if (
        touchWiringBridge.activeTouchIds.size >= 2 &&
        touchWiringBridge.activeTouchDragPointerId !== null
      ) {
        touchWiringBridge.activeTouchDragPointerId = null;
        touchWiringBridge.touchOriginSocketId = null;
        touchWiringBridge.touchDragMoved = false;
        const st = useSimulatorStore.getState();
        st.cancelWiring();
        st.setHoveredSocketId(null);
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      touchWiringBridge.activeTouchIds.delete(e.pointerId);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerEnd, true);
      window.removeEventListener('pointercancel', onPointerEnd, true);
      touchWiringBridge.activeTouchIds.clear();
    };
  }, []);

  // Dev inspection helpers for deterministic automated camera & touch verification
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    const win = window as unknown as Record<string, unknown>;
    win.__bcubeGetCameraState = () => ({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: controlsRef.current
        ? [
            controlsRef.current.target.x,
            controlsRef.current.target.y,
            controlsRef.current.target.z,
          ]
        : [0, 0, 0],
    });
    win.__bcubeProjectSocket = (socketId: string) => {
      const sock = SOCKET_MAP[socketId];
      if (!sock) return null;
      const rect = gl.domElement.getBoundingClientRect();
      const v = new THREE.Vector3(sock.position.x, sock.position.y, sock.position.z).project(camera);
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((-v.y + 1) / 2) * rect.height,
      };
    };
    return () => {
      delete win.__bcubeGetCameraState;
      delete win.__bcubeProjectSocket;
    };
  }, [camera, gl]);

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

    const alpha = 1 - Math.exp(-10 * Math.min(delta, 0.18));
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
    } else {
      invalidate();
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

  // Strict 2-finger camera controls on touch devices (1-finger reserved for wiring/switches)
  const touches = useMemo(
    () => ({
      ONE: undefined as unknown as THREE.TOUCH,
      TWO:
        cameraMode === '2d' || touchTwoFingerMode === 'pan'
          ? THREE.TOUCH.DOLLY_PAN
          : THREE.TOUCH.DOLLY_ROTATE,
    }),
    [cameraMode, touchTwoFingerMode]
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
      minDistance={6}
      maxDistance={240}
      minPolarAngle={cameraMode === '2d' ? 0 : 0.05}
      maxPolarAngle={cameraMode === '2d' ? 0.05 : Math.PI / 2.25}
      mouseButtons={mouseButtons}
      touches={touches}
      onStart={() => {
        isTransitioningRef.current = false;
      }}
    />
  );
}
