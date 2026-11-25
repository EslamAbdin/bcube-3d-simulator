import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SOCKET_MAP } from '../schema/boardSchema';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { touchWiringBridge } from './touchWiringBridge';

const PRESET_3D_TARGET = new THREE.Vector3(0, 0, 0.5);
const PRESET_2D_TARGET = new THREE.Vector3(0, 0, 0);
const EDGE_CAM_RIGHT = new THREE.Vector3();
const EDGE_CAM_UP = new THREE.Vector3();

function computeEdgeAxis(localCoord: number, span: number, margin: number): number {
  if (margin <= 1 || span <= 0) return 0;
  let raw = 0;
  if (localCoord < margin) {
    raw = -(margin - localCoord) / margin;
  } else if (localCoord > span - margin) {
    raw = (localCoord - (span - margin)) / margin;
  } else {
    return 0;
  }
  const clamped = Math.max(-1, Math.min(1, raw));
  return clamped * Math.abs(clamped);
}

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

  // Track pointer screen coordinates during active wiring for smooth camera edge-panning
  useEffect(() => {
    const clearPointer = () => {
      touchWiringBridge.pointerClientPos = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const pending = useSimulatorStore.getState().pendingSocketId;
      if (pending && touchWiringBridge.activeTouchIds.size < 2) {
        touchWiringBridge.pointerClientPos = { x: e.clientX, y: e.clientY };
        invalidate();
      } else {
        touchWiringBridge.pointerClientPos = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', clearPointer, true);
    window.addEventListener('pointercancel', clearPointer, true);
    document.addEventListener('mouseleave', clearPointer);
    return () => {
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', clearPointer, true);
      window.removeEventListener('pointercancel', clearPointer, true);
      document.removeEventListener('mouseleave', clearPointer);
      touchWiringBridge.pointerClientPos = null;
    };
  }, [invalidate]);

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
    if (isTransitioningRef.current && controlsRef.current) {
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
    }

    // Smooth camera edge-panning while dragging or placing a wire near viewport edges
    const ptr = touchWiringBridge.pointerClientPos;
    if (
      ptr &&
      controlsRef.current &&
      useSimulatorStore.getState().pendingSocketId &&
      touchWiringBridge.activeTouchIds.size < 2
    ) {
      const rect = gl.domElement.getBoundingClientRect();
      const marginX = Math.min(96, rect.width * 0.16);
      const marginY = Math.min(96, rect.height * 0.16);
      const lx = ptr.x - rect.left;
      const ly = ptr.y - rect.top;
      const edgeX = computeEdgeAxis(lx, rect.width, marginX);
      const edgeY = computeEdgeAxis(ly, rect.height, marginY);

      if (edgeX !== 0 || edgeY !== 0) {
        EDGE_CAM_RIGHT.setFromMatrixColumn(camera.matrixWorld, 0);
        EDGE_CAM_RIGHT.y = 0;
        if (EDGE_CAM_RIGHT.lengthSq() > 1e-6) EDGE_CAM_RIGHT.normalize();
        else EDGE_CAM_RIGHT.set(1, 0, 0);

        EDGE_CAM_UP.setFromMatrixColumn(camera.matrixWorld, 1);
        EDGE_CAM_UP.y = 0;
        if (EDGE_CAM_UP.lengthSq() > 1e-6) EDGE_CAM_UP.normalize();
        else EDGE_CAM_UP.set(0, 0, -1);

        // Screen down on XZ plane is -EDGE_CAM_UP
        const screenDownX = -EDGE_CAM_UP.x;
        const screenDownZ = -EDGE_CAM_UP.z;

        const target = controlsRef.current.target;
        const camDist = camera.position.distanceTo(target);
        const step = Math.max(10, camDist * 0.55) * Math.min(delta, 0.05);

        const rawDx = (EDGE_CAM_RIGHT.x * edgeX + screenDownX * edgeY) * step;
        const rawDz = (EDGE_CAM_RIGHT.z * edgeX + screenDownZ * edgeY) * step;

        const nextX = THREE.MathUtils.clamp(target.x + rawDx, -23, 23);
        const nextZ = THREE.MathUtils.clamp(target.z + rawDz, -15.5, 15.5);
        const appliedDx = nextX - target.x;
        const appliedDz = nextZ - target.z;

        if (Math.abs(appliedDx) > 1e-5 || Math.abs(appliedDz) > 1e-5) {
          target.x = nextX;
          target.z = nextZ;
          camera.position.x += appliedDx;
          camera.position.z += appliedDz;
          controlsRef.current.update();
          invalidate();
        }
      }
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
      zoomToCursor
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
