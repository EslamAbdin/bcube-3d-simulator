import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GUIDED_LESSONS,
  getCurrentGuidedStepIndex,
} from '../../data/guidedLessons';
import { SLIDE_SWITCHES, SOCKET_MAP } from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';

/**
 * 3D Visual Instructor Overlay: renders pulsing beacons on the exact source/destination
 * pins (and an arched translucent guide path) or target switches for the active guided step.
 */
export const GuidedInstructorOverlay = memo(function GuidedInstructorOverlay() {
  const activeGuidedLessonId = useSimulatorStore((s) => s.activeGuidedLessonId);
  const wires = useSimulatorStore((s) => s.wires);
  const switches = useSimulatorStore((s) => s.switches);
  const invalidate = useThree((s) => s.invalidate);

  const fromBeaconRef = useRef<THREE.Mesh>(null);
  const toBeaconRef = useRef<THREE.Mesh>(null);

  const activeStep = useMemo(() => {
    if (!activeGuidedLessonId) return null;
    const lesson = GUIDED_LESSONS.find((l) => l.id === activeGuidedLessonId);
    if (!lesson) return null;
    const idx = getCurrentGuidedStepIndex(lesson, wires, switches);
    if (idx >= lesson.steps.length) return null;
    return lesson.steps[idx];
  }, [activeGuidedLessonId, wires, switches]);

  const guideTubeGeo = useMemo(() => {
    if (!activeStep || activeStep.kind !== 'wire') return null;
    const a = SOCKET_MAP[activeStep.fromSocketId]?.position;
    const b = SOCKET_MAP[activeStep.toSocketId]?.position;
    if (!a || !b) return null;

    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const apexY = Math.max(a.y, b.y) + 1.25 + Math.min(dist * 0.14, 3.4);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x, a.y + 0.18, a.z),
      new THREE.Vector3(a.x, a.y + 0.85, a.z),
      new THREE.Vector3((a.x + b.x) / 2, apexY, (a.z + b.z) / 2),
      new THREE.Vector3(b.x, b.y + 0.85, b.z),
      new THREE.Vector3(b.x, b.y + 0.18, b.z),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.042, 6, false);
  }, [activeStep]);

  useEffect(() => {
    return () => {
      guideTubeGeo?.dispose();
    };
  }, [guideTubeGeo]);

  useFrame(({ clock }) => {
    if (!activeStep) return;
    const pulse = 1.0 + Math.sin(clock.elapsedTime * 5.5) * 0.18;
    if (fromBeaconRef.current) {
      fromBeaconRef.current.scale.set(pulse, pulse, 1);
    }
    if (toBeaconRef.current) {
      toBeaconRef.current.scale.set(pulse, pulse, 1);
    }
    invalidate();
  });

  if (!activeStep) return null;

  if (activeStep.kind === 'wire') {
    const fromPos = SOCKET_MAP[activeStep.fromSocketId]?.position;
    const toPos = SOCKET_MAP[activeStep.toSocketId]?.position;
    if (!fromPos || !toPos) return null;

    return (
      <group name="guided-instructor-wire">
        <mesh
          ref={fromBeaconRef}
          position={[fromPos.x, fromPos.y + 0.032, fromPos.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3}
        >
          <ringGeometry args={[0.11, 0.22, 24]} />
          <meshBasicMaterial
            color="#fbbf24"
            toneMapped={false}
            transparent
            opacity={0.95}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>

        <mesh
          ref={toBeaconRef}
          position={[toPos.x, toPos.y + 0.032, toPos.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3}
        >
          <ringGeometry args={[0.11, 0.22, 24]} />
          <meshBasicMaterial
            color="#38bdf8"
            toneMapped={false}
            transparent
            opacity={0.95}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>

        {guideTubeGeo && (
          <mesh geometry={guideTubeGeo} renderOrder={3}>
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.45}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group name="guided-instructor-switches">
      {activeStep.highlightSwitchIds.map((swId) => {
        const sw = SLIDE_SWITCHES.find((s) => s.id === swId);
        if (!sw) return null;
        return (
          <mesh
            key={sw.id}
            position={[sw.position.x, 0.03, sw.position.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={3}
          >
            <ringGeometry args={[0.45, 0.62, 24]} />
            <meshBasicMaterial
              color="#34d399"
              toneMapped={false}
              transparent
              opacity={0.85}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          </mesh>
        );
      })}
    </group>
  );
});
