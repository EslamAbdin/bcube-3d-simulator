import { useEffect, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
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

function InteractiveSlideSwitch({ sw }: { sw: SlideSwitchControlSpec }) {
  const isOn = useSimulatorStore((s) => Boolean(s.switches[sw.id]));
  const [hovered, setHovered] = useState(false);
  const nubRef = useRef<THREE.Group>(null);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((_, delta) => {
    if (!nubRef.current) return;
    const targetZ = isOn ? -0.23 : 0.23;
    const alpha = 1 - Math.exp(-18 * Math.min(delta, 0.05));
    nubRef.current.position.z = THREE.MathUtils.lerp(nubRef.current.position.z, targetZ, alpha);
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
      {/* Brushed silver mounting frame */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.58, 0.14, 1.16]} />
        <meshStandardMaterial
          color={hovered ? '#f8fafc' : '#cbd5e1'}
          roughness={0.28}
          metalness={0.78}
        />
      </mesh>

      {/* Dark recessed track channel */}
      <mesh position={[0, 0.135, 0]}>
        <boxGeometry args={[0.22, 0.03, 0.84]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Crisp ON indicator strip visible clearly in both 3D & 2D top-down views */}
      <mesh position={[0, 0.148, -0.49]}>
        <boxGeometry args={[0.38, 0.016, 0.1]} />
        <meshStandardMaterial
          color={isOn ? '#22c55e' : '#1e293b'}
          emissive={isOn ? '#22c55e' : '#000000'}
          emissiveIntensity={isOn ? 1.85 : 0}
          roughness={0.35}
        />
      </mesh>

      {/* Animated slider nub */}
      <group ref={nubRef} position={[0, 0.22, 0.23]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.2, 0.34]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.15} />
        </mesh>
        {/* High-contrast top nub bar */}
        <mesh position={[0, 0.104, 0]}>
          <boxGeometry args={[0.18, 0.012, 0.22]} />
          <meshStandardMaterial
            color={isOn ? '#34d399' : '#64748b'}
            emissive={isOn ? '#10b981' : '#000000'}
            emissiveIntensity={isOn ? 0.9 : 0}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* Generous invisible pointer collider */}
      <mesh
        position={[0, 0.18, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <boxGeometry args={[0.74, 0.36, 1.32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function InteractiveButtonSwitch({ btn }: { btn: ButtonSwitchControlSpec }) {
  const isPressed = useSimulatorStore((s) => Boolean(s.buttons[btn.id]));
  const isLatched = useSimulatorStore((s) => Boolean(s.latchedButtons[btn.id]));
  const [hovered, setHovered] = useState(false);

  const capGroupRef = useRef<THREE.Group>(null);
  const momentaryHeldRef = useRef(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((_, delta) => {
    if (!capGroupRef.current) return;
    const targetY = isPressed ? 0.135 : 0.2;
    const alpha = 1 - Math.exp(-22 * Math.min(delta, 0.05));
    capGroupRef.current.position.y = THREE.MathUtils.lerp(
      capGroupRef.current.position.y,
      targetY,
      alpha
    );
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
      {/* Dark square housing bezel */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.04, 0.14, 1.04]} />
        <meshStandardMaterial
          color={hovered ? '#334155' : '#1e293b'}
          roughness={0.52}
          metalness={0.2}
        />
      </mesh>

      {/* Glowing cyan perimeter latch ring when locked down */}
      {isLatched && (
        <group position={[0, 0.148, 0]}>
          <mesh position={[0, 0, -0.45]}>
            <boxGeometry args={[0.96, 0.025, 0.06]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} />
          </mesh>
          <mesh position={[0, 0, 0.45]}>
            <boxGeometry args={[0.96, 0.025, 0.06]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} />
          </mesh>
          <mesh position={[-0.45, 0, 0]}>
            <boxGeometry args={[0.06, 0.025, 0.84]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} />
          </mesh>
          <mesh position={[0.45, 0, 0]}>
            <boxGeometry args={[0.06, 0.025, 0.84]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.2} />
          </mesh>
        </group>
      )}

      {/* Animated tactile white pushbutton cap */}
      <group ref={capGroupRef} position={[0, 0.2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.76, 0.22, 0.76]} />
          <meshStandardMaterial
            color={isLatched ? '#e0f2fe' : hovered ? '#ffffff' : '#f8fafc'}
            roughness={0.32}
            metalness={0.05}
          />
        </mesh>
        <mesh position={[0, 0.112, 0]}>
          <boxGeometry args={[0.54, 0.015, 0.54]} />
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
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <boxGeometry args={[1.14, 0.4, 1.14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ReactiveLed({ led }: { led: LedIndicatorSpec }) {
  const ledState = useSimulatorStore((s) => s.ledStates[led.id]);
  const signal = ledState?.signal ?? 'FLOATING';
  const isLit = signal === 'HIGH';
  const isConflict = signal === 'CONFLICT';
  const isRed = led.bank === 'red';

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
      : isRed
        ? '#7f1d1d'
        : '#1e3a8a';

  const emissiveColor = isConflict
    ? '#f59e0b'
    : isLit
      ? isRed
        ? '#dc2626'
        : '#2563eb'
      : '#000000';

  const haloColor = isConflict ? '#fbbf24' : isRed ? '#ef4444' : '#38bdf8';

  useFrame(({ clock }) => {
    if (!isConflict) return;
    const pulse = 2.0 + Math.sin(clock.elapsedTime * 10) * 0.9;
    if (bodyMatRef.current) bodyMatRef.current.emissiveIntensity = pulse;
    if (domeMatRef.current) domeMatRef.current.emissiveIntensity = pulse;
    if (haloMatRef.current) haloMatRef.current.opacity = 0.2 + Math.sin(clock.elapsedTime * 10) * 0.1;
    if (discHaloMatRef.current) {
      discHaloMatRef.current.opacity = 0.18 + Math.sin(clock.elapsedTime * 10) * 0.1;
    }
  });

  const activeGlow = isLit || isConflict;

  return (
    <group position={[led.position.x, 0.004, led.position.z]} name={`led-${led.id}`}>
      {/* Dark collar ring */}
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.29, 0.07, 20]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* 5mm acrylic LED body */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.22, 0.22, 20]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={lensColor}
          emissive={emissiveColor}
          emissiveIntensity={isLit ? 2.25 : 0}
          roughness={0.16}
          metalness={0.05}
          transparent
          opacity={activeGlow ? 0.98 : 0.88}
        />
      </mesh>

      {/* Rounded LED dome top */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <sphereGeometry args={[0.21, 20, 14]} />
        <meshStandardMaterial
          ref={domeMatRef}
          color={lensColor}
          emissive={emissiveColor}
          emissiveIntensity={isLit ? 2.25 : 0}
          roughness={0.14}
          metalness={0.05}
          transparent
          opacity={activeGlow ? 0.98 : 0.9}
        />
      </mesh>

      {/* Additive glow halos for 3D + 2D top-down visibility when lit/conflict */}
      {activeGlow && (
        <>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.38, 16, 12]} />
            <meshBasicMaterial
              ref={haloMatRef}
              color={haloColor}
              transparent
              opacity={0.28}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.36, 20]} />
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
}

/**
 * Interactive 16 Slide Switches, 4 Active-Low Pushbuttons (momentary + latch),
 * and live reactive 8 Red + 8 Blue 3D LEDs strictly positioned from boardSchema.ts.
 */
export function ActiveIOModules() {
  return (
    <group name="active-io-modules">
      <group name="slide-switches">
        {SLIDE_SWITCHES.map((sw) => (
          <InteractiveSlideSwitch key={sw.id} sw={sw} />
        ))}
      </group>

      <group name="button-switches">
        {BUTTON_SWITCHES.map((btn) => (
          <InteractiveButtonSwitch key={btn.id} btn={btn} />
        ))}
      </group>

      <group name="led-banks">
        {LED_INDICATORS.map((led) => (
          <ReactiveLed key={led.id} led={led} />
        ))}
      </group>
    </group>
  );
}
