import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  type ButtonSwitchControlSpec,
  type LedIndicatorSpec,
  type SlideSwitchControlSpec,
} from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { playButtonSnap, playSlideClick } from '../../utils/soundEffects';

// Module-scoped shared geometries & invariant materials (never disposed on unmount)
const INVISIBLE_HITBOX_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

const SW_FRAME_GEO = new THREE.BoxGeometry(0.58, 0.14, 1.16);
const SW_TRACK_GEO = new THREE.BoxGeometry(0.22, 0.03, 0.84);
const SW_IND_GEO = new THREE.BoxGeometry(0.38, 0.016, 0.1);
const SW_NUB_GEO = new THREE.BoxGeometry(0.26, 0.2, 0.34);
const SW_NUB_TOP_GEO = new THREE.BoxGeometry(0.18, 0.012, 0.22);
const SW_COLLIDER_GEO = new THREE.BoxGeometry(0.74, 0.36, 1.32);
const SW_FRAME_MAT = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.28, metalness: 0.78 });
const SW_TRACK_MAT = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85, metalness: 0.1 });
const SW_NUB_MAT = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.5, metalness: 0.15 });

const BTN_BEZEL_GEO = new THREE.BoxGeometry(1.04, 0.14, 1.04);
const BTN_BEZEL_MAT = new THREE.MeshStandardMaterial({ color: '#2b3445', roughness: 0.5, metalness: 0.18 });
const BTN_LATCH_H_GEO = new THREE.BoxGeometry(0.96, 0.025, 0.06);
const BTN_LATCH_V_GEO = new THREE.BoxGeometry(0.06, 0.025, 0.84);
const BTN_CAP_GEO = new THREE.BoxGeometry(0.76, 0.22, 0.76);
const BTN_CAP_TOP_GEO = new THREE.BoxGeometry(0.54, 0.015, 0.54);
const BTN_COLLIDER_GEO = new THREE.BoxGeometry(1.14, 0.4, 1.14);
const BTN_LATCH_MAT = new THREE.MeshStandardMaterial({
  color: '#22d3ee',
  emissive: '#22d3ee',
  emissiveIntensity: 2.2,
});

const LED_COLLAR_GEO = new THREE.CylinderGeometry(0.26, 0.29, 0.07, 14);
const LED_BODY_GEO = new THREE.CylinderGeometry(0.21, 0.22, 0.22, 14);
const LED_DOME_GEO = new THREE.SphereGeometry(0.21, 14, 10);
const LED_POST_GEO = new THREE.BoxGeometry(0.026, 0.13, 0.026);
const LED_ANVIL_GEO = new THREE.BoxGeometry(0.068, 0.15, 0.028);
const LED_DIE_GEO = new THREE.BoxGeometry(0.044, 0.032, 0.044);
const LED_HALO_SPHERE_GEO = new THREE.SphereGeometry(0.38, 12, 10);
const LED_HALO_DISC_GEO = new THREE.CircleGeometry(0.36, 14);
const LED_COLLAR_MAT = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.2 });
const LED_METAL_MAT = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.22, metalness: 0.9 });

const InteractiveSlideSwitch = memo(function InteractiveSlideSwitch({
  sw,
  castShadow,
}: {
  sw: SlideSwitchControlSpec;
  castShadow: boolean;
}) {
  const isOn = useSimulatorStore((s) => Boolean(s.switches[sw.id]));
  const [hovered, setHovered] = useState(false);
  const nubRef = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    invalidate();
  }, [isOn, invalidate]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((_, delta) => {
    if (!nubRef.current) return;
    const targetZ = isOn ? -0.23 : 0.23;
    const diff = Math.abs(nubRef.current.position.z - targetZ);
    if (diff > 0.002) {
      const alpha = 1 - Math.exp(-18 * Math.min(delta, 0.05));
      nubRef.current.position.z = THREE.MathUtils.lerp(nubRef.current.position.z, targetZ, alpha);
      invalidate();
    } else if (diff > 0) {
      nubRef.current.position.z = targetZ;
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();
    const state = useSimulatorStore.getState();
    const nextOn = !state.switches[sw.id];
    state.toggleSlideSwitch(sw.id);
    if (state.soundEnabled) {
      playSlideClick(nextOn);
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <group position={[sw.position.x, 0.004, sw.position.z]} name={`slide-${sw.id}`}>
      {/* Crisp ON indicator strip visible clearly in both 3D & 2D top-down views */}
      <mesh position={[0, 0.148, -0.49]} geometry={SW_IND_GEO}>
        <meshStandardMaterial
          color={isOn ? '#22c55e' : '#1e293b'}
          emissive={isOn ? '#22c55e' : '#000000'}
          emissiveIntensity={isOn ? 1.85 : 0}
          roughness={0.35}
        />
      </mesh>

      {/* Animated slider nub */}
      <group ref={nubRef} position={[0, 0.22, 0.23]}>
        <mesh geometry={SW_NUB_GEO} material={SW_NUB_MAT} castShadow={castShadow} />
        {/* High-contrast top nub bar */}
        <mesh position={[0, 0.104, 0]} geometry={SW_NUB_TOP_GEO}>
          <meshStandardMaterial
            color={hovered ? '#e2e8f0' : isOn ? '#34d399' : '#64748b'}
            emissive={isOn ? '#10b981' : '#000000'}
            emissiveIntensity={isOn ? 0.9 : 0}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* Generous invisible pointer collider */}
      <mesh
        position={[0, 0.18, 0]}
        geometry={SW_COLLIDER_GEO}
        material={INVISIBLE_HITBOX_MAT}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      />
    </group>
  );
});

const InteractiveButtonSwitch = memo(function InteractiveButtonSwitch({
  btn,
  castShadow,
}: {
  btn: ButtonSwitchControlSpec;
  castShadow: boolean;
}) {
  const isPressed = useSimulatorStore((s) => Boolean(s.buttons[btn.id]));
  const isLatched = useSimulatorStore((s) => Boolean(s.latchedButtons[btn.id]));
  const [hovered, setHovered] = useState(false);

  const capGroupRef = useRef<THREE.Group>(null);
  const momentaryHeldRef = useRef(false);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    invalidate();
  }, [isPressed, invalidate]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((_, delta) => {
    if (!capGroupRef.current) return;
    const targetY = isPressed ? 0.135 : 0.2;
    const diff = Math.abs(capGroupRef.current.position.y - targetY);
    if (diff > 0.002) {
      const alpha = 1 - Math.exp(-22 * Math.min(delta, 0.05));
      capGroupRef.current.position.y = THREE.MathUtils.lerp(
        capGroupRef.current.position.y,
        targetY,
        alpha
      );
      invalidate();
    } else if (diff > 0) {
      capGroupRef.current.position.y = targetY;
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
    if (momentaryHeldRef.current) {
      momentaryHeldRef.current = false;
      const state = useSimulatorStore.getState();
      state.setButtonPressed(btn.id, false);
      if (state.soundEnabled) {
        playButtonSnap(false, false);
      }
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();
    const state = useSimulatorStore.getState();
    if (e.shiftKey) {
      momentaryHeldRef.current = false;
      state.toggleButtonLatch(btn.id);
      if (state.soundEnabled) {
        playButtonSnap(true, true);
      }
      return;
    }

    momentaryHeldRef.current = true;
    state.setButtonPressed(btn.id, true);
    if (state.soundEnabled) {
      playButtonSnap(true, false);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!momentaryHeldRef.current) return;
    momentaryHeldRef.current = false;
    const state = useSimulatorStore.getState();
    state.setButtonPressed(btn.id, false);
    if (state.soundEnabled) {
      playButtonSnap(false, false);
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    momentaryHeldRef.current = false;
    const state = useSimulatorStore.getState();
    state.toggleButtonLatch(btn.id);
    if (state.soundEnabled) {
      playButtonSnap(true, true);
    }
  };

  return (
    <group position={[btn.position.x, 0.004, btn.position.z]} name={`button-${btn.id}`}>
      {/* Glowing cyan perimeter latch ring when locked down */}
      {isLatched && (
        <group position={[0, 0.148, 0]}>
          <mesh position={[0, 0, -0.45]} geometry={BTN_LATCH_H_GEO} material={BTN_LATCH_MAT} />
          <mesh position={[0, 0, 0.45]} geometry={BTN_LATCH_H_GEO} material={BTN_LATCH_MAT} />
          <mesh position={[-0.45, 0, 0]} geometry={BTN_LATCH_V_GEO} material={BTN_LATCH_MAT} />
          <mesh position={[0.45, 0, 0]} geometry={BTN_LATCH_V_GEO} material={BTN_LATCH_MAT} />
        </group>
      )}

      {/* Animated tactile off-white square pushbutton cap */}
      <group ref={capGroupRef} position={[0, 0.2, 0]}>
        <mesh geometry={BTN_CAP_GEO} castShadow={castShadow} receiveShadow={castShadow}>
          <meshStandardMaterial
            color={isLatched ? '#e0f2fe' : hovered ? '#ffffff' : '#f1f5f9'}
            roughness={0.34}
            metalness={0.05}
          />
        </mesh>
        <mesh position={[0, 0.112, 0]} geometry={BTN_CAP_TOP_GEO}>
          <meshStandardMaterial
            color={isPressed ? '#bae6fd' : '#e2e8f0'}
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>
      </group>

      {/* Raycast pointer collider */}
      <mesh
        position={[0, 0.2, 0]}
        geometry={BTN_COLLIDER_GEO}
        material={INVISIBLE_HITBOX_MAT}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
    </group>
  );
});

const ReactiveLed = memo(function ReactiveLed({
  led,
  isHighPerf,
}: {
  led: LedIndicatorSpec;
  isHighPerf: boolean;
}) {
  const signal = useSimulatorStore((s) => s.ledStates[led.id]?.signal ?? 'FLOATING');
  const isLit = signal === 'HIGH';
  const isConflict = signal === 'CONFLICT';
  const isRed = led.bank === 'red';
  const activeGlow = isLit || isConflict;

  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const domeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const discHaloMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const lensColor = isConflict
    ? '#f59e0b'
    : isLit
      ? isRed
        ? '#ef4444'
        : '#38bdf8'
      : '#eef6ff';

  const emissiveColor = isConflict
    ? '#f59e0b'
    : isLit
      ? isRed
        ? '#dc2626'
        : '#2563eb'
      : '#000000';

  const dieColor = isConflict
    ? '#fde68a'
    : isLit
      ? isRed
        ? '#fecaca'
        : '#bae6fd'
      : isRed
        ? '#7f1d1d'
        : '#1e3a8a';

  const haloColor = isConflict ? '#fbbf24' : isRed ? '#ef4444' : '#38bdf8';
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ clock }) => {
    if (!isConflict) return;
    const pulse = 2.0 + Math.sin(clock.elapsedTime * 10) * 0.9;
    if (bodyMatRef.current) bodyMatRef.current.emissiveIntensity = pulse;
    if (domeMatRef.current) domeMatRef.current.emissiveIntensity = pulse;
    if (haloMatRef.current) haloMatRef.current.opacity = 0.2 + Math.sin(clock.elapsedTime * 10) * 0.1;
    if (discHaloMatRef.current) {
      discHaloMatRef.current.opacity = 0.18 + Math.sin(clock.elapsedTime * 10) * 0.1;
    }
    invalidate();
  });

  return (
    <group position={[led.position.x, 0.004, led.position.z]} name={`led-${led.id}`}>
      {/* Internal semiconductor die cup (collars, posts & anvils are instanced across all 16 LEDs) */}
      <mesh position={[0.025, 0.205, 0]} geometry={LED_DIE_GEO}>
        <meshStandardMaterial
          color={dieColor}
          emissive={activeGlow ? emissiveColor : '#000000'}
          emissiveIntensity={activeGlow ? 2.4 : 0}
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>

      {/* 5mm water-clear acrylic LED body (crystal clear when OFF, glowing color when HIGH) */}
      <mesh position={[0, 0.16, 0]} geometry={LED_BODY_GEO} castShadow={isHighPerf}>
        <meshStandardMaterial
          ref={bodyMatRef}
          color={lensColor}
          emissive={emissiveColor}
          emissiveIntensity={isLit ? 2.35 : 0}
          roughness={activeGlow ? 0.12 : 0.07}
          metalness={activeGlow ? 0.05 : 0.12}
          transparent
          opacity={activeGlow ? 0.94 : 0.34}
          depthWrite={activeGlow}
        />
      </mesh>

      {/* Rounded water-clear LED dome top (body & collar already cast shadow) */}
      <mesh position={[0, 0.27, 0]} geometry={LED_DOME_GEO}>
        <meshStandardMaterial
          ref={domeMatRef}
          color={lensColor}
          emissive={emissiveColor}
          emissiveIntensity={isLit ? 2.35 : 0}
          roughness={activeGlow ? 0.12 : 0.06}
          metalness={activeGlow ? 0.05 : 0.14}
          transparent
          opacity={activeGlow ? 0.95 : 0.36}
          depthWrite={activeGlow}
        />
      </mesh>

      {/* Additive glow halos for 3D + 2D top-down visibility when lit/conflict */}
      {activeGlow && (
        <>
          {isHighPerf && (
            <mesh position={[0, 0.24, 0]} geometry={LED_HALO_SPHERE_GEO}>
              <meshBasicMaterial
                ref={haloMatRef}
                color={haloColor}
                transparent
                opacity={0.28}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
          <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LED_HALO_DISC_GEO}>
            <meshBasicMaterial
              ref={discHaloMatRef}
              color={haloColor}
              transparent
              opacity={0.24}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
});

/**
 * Interactive 16 Slide Switches, 4 Active-Low Pushbuttons (momentary + latch),
 * and live reactive 8 Red + 8 Blue water-clear 3D LEDs strictly positioned from boardSchema.ts.
 */
export const ActiveIOModules = memo(function ActiveIOModules() {
  const isHighPerf = useSimulatorStore((s) => s.performanceMode === 'high');
  const swFrameRef = useRef<THREE.InstancedMesh>(null);
  const swTrackRef = useRef<THREE.InstancedMesh>(null);
  const btnBezelRef = useRef<THREE.InstancedMesh>(null);
  const ledCollarRef = useRef<THREE.InstancedMesh>(null);
  const ledPostRef = useRef<THREE.InstancedMesh>(null);
  const ledAnvilRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();

    const frames = swFrameRef.current;
    const tracks = swTrackRef.current;
    if (frames && tracks) {
      SLIDE_SWITCHES.forEach((sw, idx) => {
        dummy.position.set(sw.position.x, 0.074, sw.position.z);
        dummy.updateMatrix();
        frames.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(sw.position.x, 0.139, sw.position.z);
        dummy.updateMatrix();
        tracks.setMatrixAt(idx, dummy.matrix);
      });
      frames.instanceMatrix.needsUpdate = true;
      tracks.instanceMatrix.needsUpdate = true;
    }

    const bezels = btnBezelRef.current;
    if (bezels) {
      BUTTON_SWITCHES.forEach((btn, idx) => {
        dummy.position.set(btn.position.x, 0.074, btn.position.z);
        dummy.updateMatrix();
        bezels.setMatrixAt(idx, dummy.matrix);
      });
      bezels.instanceMatrix.needsUpdate = true;
    }

    const collars = ledCollarRef.current;
    const posts = ledPostRef.current;
    const anvils = ledAnvilRef.current;
    if (!collars || !posts || !anvils) return;

    LED_INDICATORS.forEach((led, idx) => {
      const baseX = led.position.x;
      const baseZ = led.position.z;

      dummy.position.set(baseX, 0.039, baseZ);
      dummy.updateMatrix();
      collars.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(baseX - 0.045, 0.129, baseZ);
      dummy.updateMatrix();
      posts.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(baseX + 0.035, 0.144, baseZ);
      dummy.updateMatrix();
      anvils.setMatrixAt(idx, dummy.matrix);
    });

    collars.instanceMatrix.needsUpdate = true;
    posts.instanceMatrix.needsUpdate = true;
    anvils.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group name="active-io-modules">
      <group name="slide-switches">
        <instancedMesh
          ref={swFrameRef}
          args={[SW_FRAME_GEO, SW_FRAME_MAT, SLIDE_SWITCHES.length]}
          castShadow={isHighPerf}
          receiveShadow={isHighPerf}
        />
        <instancedMesh
          ref={swTrackRef}
          args={[SW_TRACK_GEO, SW_TRACK_MAT, SLIDE_SWITCHES.length]}
        />
        {SLIDE_SWITCHES.map((sw) => (
          <InteractiveSlideSwitch key={sw.id} sw={sw} castShadow={isHighPerf} />
        ))}
      </group>

      <group name="button-switches">
        <instancedMesh
          ref={btnBezelRef}
          args={[BTN_BEZEL_GEO, BTN_BEZEL_MAT, BUTTON_SWITCHES.length]}
          castShadow={isHighPerf}
          receiveShadow={isHighPerf}
        />
        {BUTTON_SWITCHES.map((btn) => (
          <InteractiveButtonSwitch key={btn.id} btn={btn} castShadow={isHighPerf} />
        ))}
      </group>

      <group name="led-banks">
        <instancedMesh
          ref={ledCollarRef}
          args={[LED_COLLAR_GEO, LED_COLLAR_MAT, LED_INDICATORS.length]}
          castShadow={isHighPerf}
          receiveShadow={isHighPerf}
        />
        <instancedMesh
          ref={ledPostRef}
          args={[LED_POST_GEO, LED_METAL_MAT, LED_INDICATORS.length]}
        />
        <instancedMesh
          ref={ledAnvilRef}
          args={[LED_ANVIL_GEO, LED_METAL_MAT, LED_INDICATORS.length]}
        />
        {LED_INDICATORS.map((led) => (
          <ReactiveLed key={led.id} led={led} isHighPerf={isHighPerf} />
        ))}
      </group>
    </group>
  );
});
