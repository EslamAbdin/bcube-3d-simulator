import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MODULE_MAP } from '../../schema/boardSchema';
import { createSevenSegFaceTexture, useCanvasTexture } from '../textures/silkscreenGenerator';
import { StandbyHeaderBank, type StandbyHeaderStripSpec } from './WhitePinHeader';

function RotaryKnob({ position, radius = 0.48 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      {/* Base nut collar */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.92, radius * 0.96, 0.08, 20]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.82} />
      </mesh>
      {/* Matte-black ribbed knob body */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.78, radius * 0.84, 0.34, 24]} />
        <meshStandardMaterial color="#181c24" roughness={0.55} metalness={0.18} />
      </mesh>
      {/* Top brushed aluminum inlay */}
      <mesh position={[0, 0.392, 0]}>
        <cylinderGeometry args={[radius * 0.62, radius * 0.62, 0.02, 20]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.32} metalness={0.78} />
      </mesh>
      {/* White pointer index mark */}
      <mesh position={[0, 0.405, -radius * 0.3]}>
        <boxGeometry args={[0.06, 0.02, radius * 0.42]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
    </group>
  );
}

function ResistorRow({
  x,
  z,
  count,
  spacing,
  bodyColor,
}: {
  x: number;
  z: number;
  count: number;
  spacing: number;
  bodyColor: string;
}) {
  const startX = x - ((count - 1) * spacing) / 2;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const rx = startX + i * spacing;
        return (
          <group key={i} position={[rx, 0.08, z]}>
            {/* Silver axial wire leads */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.92, 8]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.88} />
            </mesh>
            {/* Ceramic resistor body */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.085, 0.085, 0.46, 12]} />
              <meshStandardMaterial color={bodyColor} roughness={0.45} metalness={0.08} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Renders procedural 3D hardware for all standby perimeter I/O and utility blocks
 * strictly anchored to their boardSchema.ts module centers.
 */
export function StandbyIOModules() {
  const sevenSegUnlitTex = useCanvasTexture(() => createSevenSegFaceTexture('8.8.', false), []);
  const freqLitTex = useCanvasTexture(() => createSevenSegFaceTexture('000.0', true), []);

  const dipSliderRef = useRef<THREE.InstancedMesh>(null);
  const dipSliderGeo = useMemo(() => new THREE.BoxGeometry(0.09, 0.05, 0.14), []);
  const dipSliderMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 }),
    []
  );

  useEffect(() => {
    return () => {
      dipSliderGeo.dispose();
      dipSliderMat.dispose();
    };
  }, [dipSliderGeo, dipSliderMat]);

  const dipMod = MODULE_MAP.DIP_SWITCH;
  const waveMod = MODULE_MAP.WAVEFORM_GEN;
  const pullUpTop = MODULE_MAP.PULL_UP_TOP;
  const pullDownTop = MODULE_MAP.PULL_DOWN_TOP;
  const voltMod = MODULE_MAP.VOLTAGE_CONTROL;
  const spkMod = MODULE_MAP.SPEAKER;
  const segAnode = MODULE_MAP.SEVEN_SEG_ANODE;
  const segCathode = MODULE_MAP.SEVEN_SEG_CATHODE;
  const daqIn = MODULE_MAP.DAQ_INPUT;
  const freqMod = MODULE_MAP.FREQ_COUNTER;
  const pullUpBot = MODULE_MAP.PULL_UP_BOTTOM;
  const pullDownBot = MODULE_MAP.PULL_DOWN_BOTTOM;
  const daqOut = MODULE_MAP.DAQ_OUTPUT;
  const oscMod = MODULE_MAP.OSC_INPUT;
  const usbMod = MODULE_MAP.USB_PORTS;

  useLayoutEffect(() => {
    const mesh = dipSliderRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (const offsetX of [-1.45, 0.55]) {
      for (let i = 0; i < 8; i++) {
        const sx = dipMod.position.x + offsetX - 0.63 + i * 0.18;
        dummy.position.set(sx, 0.24, dipMod.position.z + 0.3);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [dipMod.position.x, dipMod.position.z]);

  const standbyStrips = useMemo<StandbyHeaderStripSpec[]>(
    () => [
      { key: 'dip-hdr', x: dipMod.position.x + 2.45, yBase: 0.005, yTop: 0.22, z: dipMod.position.z + 0.2, rows: 4, cols: 2, pitchZ: 0.44 },
      { key: 'wave-hdr', x: waveMod.position.x + 2.45, yBase: 0.005, yTop: 0.22, z: waveMod.position.z + 0.35, rows: 6, cols: 2, pitchZ: 0.44 },
      { key: 'pu-top-hdr', x: pullUpTop.position.x, yBase: 0.005, yTop: 0.22, z: pullUpTop.position.z + 0.9, rows: 2, cols: 8, pitchX: 0.46, pitchZ: 0.254 },
      { key: 'pd-top-hdr', x: pullDownTop.position.x, yBase: 0.005, yTop: 0.22, z: pullDownTop.position.z + 0.9, rows: 2, cols: 8, pitchX: 0.46, pitchZ: 0.254 },
      { key: 'volt-hdr', x: voltMod.position.x + 2.55, yBase: 0.005, yTop: 0.22, z: voltMod.position.z + 0.25, rows: 3, cols: 2, pitchZ: 0.44 },
      { key: 'spk-hdr', x: spkMod.position.x + 2.2, yBase: 0.005, yTop: 0.22, z: spkMod.position.z + 0.25, rows: 2, cols: 2, pitchZ: 0.44 },
      { key: 'ca-hdr', x: segAnode.position.x - 2.45, yBase: 0.005, yTop: 0.22, z: segAnode.position.z + 0.25, rows: 8, cols: 2, pitchZ: 0.42 },
      { key: 'cc-hdr', x: segCathode.position.x - 2.45, yBase: 0.005, yTop: 0.22, z: segCathode.position.z + 0.25, rows: 8, cols: 2, pitchZ: 0.42 },
      { key: 'pu-bot-hdr', x: pullUpBot.position.x, yBase: 0.005, yTop: 0.22, z: pullUpBot.position.z - 0.55, rows: 2, cols: 6, pitchX: 0.46, pitchZ: 0.254 },
      { key: 'pd-bot-hdr', x: pullDownBot.position.x, yBase: 0.005, yTop: 0.22, z: pullDownBot.position.z - 0.55, rows: 2, cols: 6, pitchX: 0.46, pitchZ: 0.254 },
      { key: 'freq-hdr', x: freqMod.position.x + 2.25, yBase: 0.005, yTop: 0.22, z: freqMod.position.z + 0.25, rows: 2, cols: 2, pitchZ: 0.44 },
    ],
    [dipMod, waveMod, pullUpTop, pullDownTop, voltMod, spkMod, segAnode, segCathode, pullUpBot, pullDownBot, freqMod]
  );

  return (
    <group name="standby-io-modules">
      <StandbyHeaderBank strips={standbyStrips} />

      {/* 1. DIP SWITCH (2x red 8-way DIP blocks) */}
      <group position={[dipMod.position.x, 0.004, dipMod.position.z]}>
        {[-1.45, 0.55].map((ox, i) => (
          <mesh key={i} position={[ox, 0.11, 0.2]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 0.22, 0.78]} />
            <meshStandardMaterial color="#dc2626" roughness={0.42} metalness={0.08} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={dipSliderRef} args={[dipSliderGeo, dipSliderMat, 16]} castShadow />

      {/* 2. WAVEFORM GENERATOR (3 rotary knobs + silver mode toggle) */}
      <group position={[waveMod.position.x, 0.004, waveMod.position.z]}>
        <RotaryKnob position={[-1.55, 0, -0.65]} radius={0.45} />
        <RotaryKnob position={[0.35, 0, -0.65]} radius={0.45} />
        <RotaryKnob position={[-0.6, 0, 1.45]} radius={0.45} />
        {/* Silver toggle switch */}
        <mesh position={[-2.15, 0.08, 1.45]} castShadow>
          <boxGeometry args={[0.42, 0.16, 0.56]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[-2.15, 0.34, 1.45]} rotation={[0.25, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.42, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.9} />
        </mesh>
      </group>

      {/* 3. TOP & BOTTOM PULL-UP / PULL-DOWN RESISTOR ARRAYS */}
      <ResistorRow x={pullUpTop.position.x} z={pullUpTop.position.z - 0.05} count={8} spacing={0.46} bodyColor="#d6c39c" />
      <ResistorRow x={pullDownTop.position.x} z={pullDownTop.position.z - 0.05} count={8} spacing={0.46} bodyColor="#60a5fa" />
      <ResistorRow x={pullUpBot.position.x} z={pullUpBot.position.z + 0.52} count={6} spacing={0.46} bodyColor="#d6c39c" />
      <ResistorRow x={pullDownBot.position.x} z={pullDownBot.position.z + 0.52} count={6} spacing={0.46} bodyColor="#60a5fa" />

      {/* 4. VOLTAGE CONTROL */}
      <group position={[voltMod.position.x, 0.004, voltMod.position.z]}>
        <RotaryKnob position={[-1.65, 0, 0.2]} radius={0.5} />
        <RotaryKnob position={[0.55, 0, 0.2]} radius={0.5} />
      </group>

      {/* 5. SPEAKER */}
      <group position={[spkMod.position.x, 0.004, spkMod.position.z]}>
        <mesh position={[-0.95, 0.1, 0.25]} castShadow receiveShadow>
          <cylinderGeometry args={[0.88, 0.92, 0.2, 28]} />
          <meshStandardMaterial color="#181c24" roughness={0.62} metalness={0.25} />
        </mesh>
        <mesh position={[-0.95, 0.205, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.72, 28]} />
          <meshStandardMaterial color="#0f172a" roughness={0.85} />
        </mesh>
        <RotaryKnob position={[0.9, 0, 0.25]} radius={0.38} />
      </group>

      {/* 6. 2x COMMON-ANODE & 2x COMMON-CATHODE 7-SEGMENT DISPLAYS */}
      {[segAnode, segCathode].map((seg) => (
        <group key={seg.id} position={[seg.position.x + 0.68, 0.004, seg.position.z + 0.25]}>
          <mesh position={[0, 0.19, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.38, 2.1]} />
            <meshStandardMaterial color="#111827" roughness={0.42} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.384, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.2, 1.9]} />
            <meshStandardMaterial map={sevenSegUnlitTex} roughness={0.28} metalness={0.05} />
          </mesh>
        </group>
      ))}

      {/* 7. 4-DIGIT FREQUENCY COUNTER */}
      <group position={[freqMod.position.x - 0.38, 0.004, freqMod.position.z + 0.25]}>
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.9, 0.28, 1.45]} />
          <meshStandardMaterial color="#0f172a" roughness={0.38} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.284, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.65, 1.25]} />
          <meshStandardMaterial
            map={freqLitTex}
            emissiveMap={freqLitTex}
            emissive="#ef4444"
            emissiveIntensity={0.65}
            roughness={0.25}
          />
        </mesh>
      </group>

      {/* 8. DAQ INPUT & DAQ OUTPUT SHROUDED BOX HEADERS */}
      {[daqIn, daqOut].map((daq) => (
        <group key={daq.id} position={[daq.position.x, 0.004, daq.position.z + 0.25]}>
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.55, 0.36, 0.92]} />
            <meshStandardMaterial color="#181c24" roughness={0.55} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.362, 0]}>
            <boxGeometry args={[2.22, 0.02, 0.6]} />
            <meshStandardMaterial color="#090d14" roughness={0.85} />
          </mesh>
          {Array.from({ length: 8 }).map((_, c) =>
            [-0.14, 0.14].map((pz, r) => (
              <mesh key={`${c}-${r}`} position={[-0.9 + c * 0.26, 0.38, pz]}>
                <boxGeometry args={[0.05, 0.12, 0.05]} />
                <meshStandardMaterial color="#eab308" roughness={0.25} metalness={0.9} />
              </mesh>
            ))
          )}
        </group>
      ))}

      {/* 9. OSCILLOSCOPE BNC CONNECTOR */}
      <group position={[oscMod.position.x, 0.004, oscMod.position.z + 0.28]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.16, 6]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.4, 0.46, 20]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.22} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.592, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.61, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 12]} />
          <meshStandardMaterial color="#eab308" roughness={0.2} metalness={0.95} />
        </mesh>
      </group>

      {/* 10. USB PORTS, RESET BUTTON & GREEN POWER LED */}
      <group position={[usbMod.position.x, 0.004, usbMod.position.z]}>
        {[-1.45, 1.15].map((ox, i) => (
          <group key={i} position={[ox, 0.34, -0.22]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.38, 0.68, 1.24]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.26} metalness={0.86} />
            </mesh>
            <mesh position={[0, 0, 0.625]}>
              <boxGeometry args={[0.92, 0.42, 0.02]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Small red Reset pushbutton */}
        <mesh position={[-1.45, 0.08, 1.45]} castShadow>
          <boxGeometry args={[0.56, 0.16, 0.56]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[-1.45, 0.2, 1.45]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.14, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.35} />
        </mesh>

        {/* Softly glowing green Main Power LED */}
        <group position={[1.15, 0, 1.45]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.22, 0.24, 0.08, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.17, 16, 12]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={2.2}
              roughness={0.18}
            />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <sphereGeometry args={[0.3, 14, 10]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
