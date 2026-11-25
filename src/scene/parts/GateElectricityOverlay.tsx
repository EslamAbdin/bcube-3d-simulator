import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ALL_MODULES,
  BOARD_DIMENSIONS,
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  SOCKET_MAP,
  getGateModuleLayout,
  type ActiveGateModuleType,
} from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';

interface PinLedPoint {
  socketId: string;
  x: number;
  y: number;
  z: number;
}

interface TraceBarPoint {
  socketId: string;
  x: number;
  y: number;
  z: number;
  length: number;
}

interface GateCorePoint {
  socketId: string;
  x: number;
  y: number;
  z: number;
}

const GATE_TRACE_METRICS: Record<
  ActiveGateModuleType,
  { inEnd: number; outStart: number; coreX: number }
> = {
  IC_7408: { inEnd: -0.54, outStart: 0.395, coreX: -0.08 },
  IC_7404: { inEnd: -0.5, outStart: 0.6, coreX: -0.18 },
  IC_7400: { inEnd: -0.58, outStart: 0.54, coreX: -0.14 },
  IC_7432: { inEnd: -0.49, outStart: 0.5, coreX: -0.02 },
  IC_7402: { inEnd: -0.53, outStart: 0.59, coreX: -0.08 },
  IC_7486: { inEnd: -0.55, outStart: 0.54, coreX: 0.02 },
};

const SHARED_SMD_BEZEL_GEO = new THREE.BoxGeometry(0.17, 0.026, 0.13);
const SHARED_SMD_EMITTER_GEO = new THREE.BoxGeometry(0.115, 0.022, 0.088);
const SHARED_TRACE_GEO = new THREE.BoxGeometry(1, 0.012, 0.068);
const SHARED_CORE_GEO = new THREE.BoxGeometry(0.22, 0.014, 0.13);

const SHARED_SMD_BEZEL_MAT = new THREE.MeshBasicMaterial({ color: '#0f172a' });
const SHARED_LIVE_COLOR_MAT = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  toneMapped: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

const COLOR_LED_HIGH = new THREE.Color('#22c55e');
const COLOR_LED_LOW = new THREE.Color('#dc2626');
const COLOR_LED_CONFLICT = new THREE.Color('#f59e0b');
const COLOR_LED_FLOATING = new THREE.Color('#1e293b');

const COLOR_TRACE_HIGH = new THREE.Color('#4ade80');
const COLOR_TRACE_LOW = new THREE.Color('#b91c1c');
const COLOR_TRACE_CONFLICT = new THREE.Color('#f59e0b');

function buildElectricityLayout() {
  const pinLeds: PinLedPoint[] = [];
  const traces: TraceBarPoint[] = [];
  const cores: GateCorePoint[] = [];

  const halfPitch = BOARD_DIMENSIONS.dualHolePitch / 2;

  for (const mod of ALL_MODULES) {
    if (mod.zone !== 'center_grid' || mod.status !== 'active' || !mod.gates) continue;
    const gType = mod.type as ActiveGateModuleType;
    const metrics = GATE_TRACE_METRICS[gType];
    const layout = getGateModuleLayout(mod);
    const baseY = layout.surfaceY;

    for (const gate of mod.gates) {
      for (const pinNum of gate.inputPins) {
        const sockId = `${mod.id}:PIN${pinNum}:A`;
        const sock = SOCKET_MAP[sockId];
        if (!sock) continue;

        pinLeds.push({
          socketId: sockId,
          x: mod.position.x - 1.56,
          y: baseY + 0.018,
          z: sock.position.z,
        });

        const len = metrics.inEnd - -1.74;
        traces.push({
          socketId: sockId,
          x: mod.position.x + (-1.74 + metrics.inEnd) / 2,
          y: baseY + 0.008,
          z: sock.position.z,
          length: len,
        });
      }

      const outSockId = `${mod.id}:PIN${gate.outputPin}:A`;
      const outSock = SOCKET_MAP[outSockId];
      if (outSock) {
        pinLeds.push({
          socketId: outSockId,
          x: mod.position.x + 1.56,
          y: baseY + 0.018,
          z: outSock.position.z,
        });

        const outLen = 1.74 - metrics.outStart;
        traces.push({
          socketId: outSockId,
          x: mod.position.x + (metrics.outStart + 1.74) / 2,
          y: baseY + 0.008,
          z: outSock.position.z,
          length: outLen,
        });

        cores.push({
          socketId: outSockId,
          x: mod.position.x + metrics.coreX,
          y: baseY + 0.011,
          z: outSock.position.z,
        });
      }
    }
  }

  // Perimeter SMD pin LEDs adjacent to white headers for switches, buttons, and LED banks
  for (const sw of SLIDE_SWITCHES) {
    const sock = SOCKET_MAP[sw.socketIds[0]];
    if (sock) {
      pinLeds.push({
        socketId: sw.socketIds[0],
        x: sock.position.x + halfPitch - 0.36,
        y: 0.02,
        z: sock.position.z,
      });
    }
  }

  for (const btn of BUTTON_SWITCHES) {
    const sock = SOCKET_MAP[btn.socketIds[0]];
    if (sock) {
      pinLeds.push({
        socketId: btn.socketIds[0],
        x: sock.position.x + halfPitch - 0.36,
        y: 0.02,
        z: sock.position.z,
      });
    }
  }

  for (const led of LED_INDICATORS) {
    const sock = SOCKET_MAP[led.socketIds[0]];
    if (sock) {
      pinLeds.push({
        socketId: led.socketIds[0],
        x: sock.position.x + halfPitch + 0.36,
        y: 0.02,
        z: sock.position.z,
      });
    }
  }

  return { pinLeds, traces, cores };
}

/**
 * Renders live per-pin SMD LEDs on all active inputs/outputs, plus live
 * lit electricity lines and symbol cores inside every active logic gate IC
 * in just 4 InstancedMeshes with zero shadow or lighting shader overhead.
 */
export const GateElectricityOverlay = memo(function GateElectricityOverlay() {
  const socketStates = useSimulatorStore((s) => s.socketStates);
  const invalidate = useThree((s) => s.invalidate);

  const layout = useMemo(() => buildElectricityLayout(), []);

  const bezelRef = useRef<THREE.InstancedMesh>(null);
  const emitterRef = useRef<THREE.InstancedMesh>(null);
  const traceRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);

  // Static transforms for SMD bezels & emitter caps
  useLayoutEffect(() => {
    const bezelMesh = bezelRef.current;
    const emitterMesh = emitterRef.current;
    if (!bezelMesh || !emitterMesh) return;

    const dummy = new THREE.Object3D();
    layout.pinLeds.forEach((p, idx) => {
      dummy.position.set(p.x, p.y - 0.004, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bezelMesh.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, p.y + 0.004, p.z);
      dummy.updateMatrix();
      emitterMesh.setMatrixAt(idx, dummy.matrix);
    });
    bezelMesh.instanceMatrix.needsUpdate = true;
    emitterMesh.instanceMatrix.needsUpdate = true;
  }, [layout]);

  // Reactive signal updates (SMD colors + lit/cut-off electricity traces + gate cores)
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();

    const emitterMesh = emitterRef.current;
    if (emitterMesh) {
      layout.pinLeds.forEach((p, idx) => {
        const sig = socketStates[p.socketId] ?? 'FLOATING';
        const col =
          sig === 'HIGH'
            ? COLOR_LED_HIGH
            : sig === 'LOW'
              ? COLOR_LED_LOW
              : sig === 'CONFLICT'
                ? COLOR_LED_CONFLICT
                : COLOR_LED_FLOATING;
        emitterMesh.setColorAt(idx, col);
      });
      if (emitterMesh.instanceColor) emitterMesh.instanceColor.needsUpdate = true;
    }

    const traceMesh = traceRef.current;
    if (traceMesh) {
      layout.traces.forEach((t, idx) => {
        const sig = socketStates[t.socketId] ?? 'FLOATING';
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.set(0, 0, 0);

        if (sig === 'FLOATING') {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          traceMesh.setMatrixAt(idx, dummy.matrix);
          traceMesh.setColorAt(idx, COLOR_LED_FLOATING);
        } else {
          dummy.scale.set(t.length, 1, sig === 'LOW' ? 0.84 : 1.05);
          dummy.updateMatrix();
          traceMesh.setMatrixAt(idx, dummy.matrix);
          traceMesh.setColorAt(
            idx,
            sig === 'HIGH'
              ? COLOR_TRACE_HIGH
              : sig === 'CONFLICT'
                ? COLOR_TRACE_CONFLICT
                : COLOR_TRACE_LOW
          );
        }
      });
      traceMesh.instanceMatrix.needsUpdate = true;
      if (traceMesh.instanceColor) traceMesh.instanceColor.needsUpdate = true;
    }

    const coreMesh = coreRef.current;
    if (coreMesh) {
      layout.cores.forEach((c, idx) => {
        const sig = socketStates[c.socketId] ?? 'FLOATING';
        dummy.position.set(c.x, c.y, c.z);
        dummy.rotation.set(0, 0, 0);

        if (sig === 'FLOATING') {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          coreMesh.setMatrixAt(idx, dummy.matrix);
          coreMesh.setColorAt(idx, COLOR_LED_FLOATING);
        } else {
          const s = sig === 'CONFLICT' ? 1.15 : sig === 'HIGH' ? 1 : 0.82;
          dummy.scale.set(s, 1, s);
          dummy.updateMatrix();
          coreMesh.setMatrixAt(idx, dummy.matrix);
          coreMesh.setColorAt(
            idx,
            sig === 'HIGH'
              ? COLOR_TRACE_HIGH
              : sig === 'CONFLICT'
                ? COLOR_TRACE_CONFLICT
                : COLOR_TRACE_LOW
          );
        }
      });
      coreMesh.instanceMatrix.needsUpdate = true;
      if (coreMesh.instanceColor) coreMesh.instanceColor.needsUpdate = true;
    }

    invalidate();
  }, [layout, socketStates, invalidate]);

  return (
    <group name="gate-electricity-overlay">
      <instancedMesh
        ref={bezelRef}
        args={[SHARED_SMD_BEZEL_GEO, SHARED_SMD_BEZEL_MAT, layout.pinLeds.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={emitterRef}
        args={[SHARED_SMD_EMITTER_GEO, SHARED_LIVE_COLOR_MAT, layout.pinLeds.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={traceRef}
        args={[SHARED_TRACE_GEO, SHARED_LIVE_COLOR_MAT, layout.traces.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={coreRef}
        args={[SHARED_CORE_GEO, SHARED_LIVE_COLOR_MAT, layout.cores.length]}
        frustumCulled={false}
      />
    </group>
  );
});
