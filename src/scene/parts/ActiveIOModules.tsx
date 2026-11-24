import { BUTTON_SWITCHES, LED_INDICATORS, SLIDE_SWITCHES } from '../../schema/boardSchema';

/**
 * Renders all v1 active perimeter hardware parts (16 Slide Switches,
 * 4 Tactile Pushbuttons, 8 Red LEDs, 8 Blue LEDs) strictly from boardSchema.ts.
 * Milestone 2: visual hardware only (interactive toggle/LED glow arrives in Milestone 3).
 */
export function ActiveIOModules() {
  return (
    <group name="active-io-modules">
      {/* 16x Slide Switches (SW1..SW16) */}
      <group name="slide-switches">
        {SLIDE_SWITCHES.map((sw) => (
          <group key={sw.id} position={[sw.position.x, 0.004, sw.position.z]}>
            {/* Brushed silver mounting frame */}
            <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.58, 0.14, 1.16]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.28} metalness={0.78} />
            </mesh>
            {/* Dark recessed channel */}
            <mesh position={[0, 0.135, 0]}>
              <boxGeometry args={[0.22, 0.03, 0.84]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.1} />
            </mesh>
            {/* Dark slider nub parked in default OFF position (+Z) */}
            <mesh position={[0, 0.22, 0.22]} castShadow>
              <boxGeometry args={[0.25, 0.2, 0.34]} />
              <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.15} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 4x Tactile Button Switches (BTN1..BTN4) */}
      <group name="button-switches">
        {BUTTON_SWITCHES.map((btn) => (
          <group key={btn.id} position={[btn.position.x, 0.004, btn.position.z]}>
            {/* Dark square housing bezel */}
            <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.04, 0.14, 1.04]} />
              <meshStandardMaterial color="#1e293b" roughness={0.52} metalness={0.2} />
            </mesh>
            {/* Tactile white pushbutton cap */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.76, 0.22, 0.76]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.32} metalness={0.05} />
            </mesh>
            {/* Subtle top cap indent rim */}
            <mesh position={[0, 0.312, 0]}>
              <boxGeometry args={[0.54, 0.015, 0.54]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.45} metalness={0.05} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 8x Red LEDs & 8x Blue LEDs */}
      <group name="led-banks">
        {LED_INDICATORS.map((led) => {
          const isRed = led.bank === 'red';
          const unlitColor = isRed ? '#881337' : '#1d4ed8';
          return (
            <group key={led.id} position={[led.position.x, 0.004, led.position.z]}>
              {/* Dark collar ring */}
              <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.26, 0.29, 0.07, 20]} />
                <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.2} />
              </mesh>
              {/* 5mm acrylic LED body */}
              <mesh position={[0, 0.16, 0]} castShadow>
                <cylinderGeometry args={[0.21, 0.22, 0.22, 20]} />
                <meshStandardMaterial
                  color={unlitColor}
                  roughness={0.18}
                  metalness={0.06}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              {/* Rounded LED dome top */}
              <mesh position={[0, 0.27, 0]} castShadow>
                <sphereGeometry args={[0.21, 20, 14]} />
                <meshStandardMaterial
                  color={unlitColor}
                  roughness={0.16}
                  metalness={0.06}
                  transparent
                  opacity={0.92}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
