/* =========================================================================
   bCube Simulator Zustand Store — Serializable Circuit State & Logic Sync
   ========================================================================= */

import { create } from 'zustand';
import {
  BUTTON_SWITCHES,
  SLIDE_SWITCHES,
  SOCKET_MAP,
} from '../schema/boardSchema';
import {
  runSimulation,
  type ConflictInfo,
  type LedOutputState,
  type WireSpec,
} from '../engine/LogicEngine';
import type { SignalLevel } from '../engine/gateEvaluators';

export type CameraMode = '3d' | '2d';

export const WIRE_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Black', hex: '#1e293b' },
] as const;

export interface SerializableCircuit {
  version: number;
  switches: Record<string, boolean>;
  buttons: Record<string, boolean>;
  wires: WireSpec[];
}

interface SimulatorState {
  switches: Record<string, boolean>;
  buttons: Record<string, boolean>;
  latchedButtons: Record<string, boolean>;
  wires: WireSpec[];
  activeWireColor: string;
  autoCycleWireColor: boolean;
  wireColorIndex: number;
  cameraMode: CameraMode;
  cameraResetCount: number;
  ttlFloatingIsHigh: boolean;
  soundEnabled: boolean;
  hoveredSocketId: string | null;
  hoveredStandbyModuleId: string | null;

  // Derived simulation state
  netStates: Record<string, SignalLevel>;
  socketStates: Record<string, SignalLevel>;
  ledStates: Record<string, LedOutputState>;
  conflicts: ConflictInfo[];

  // Actions
  toggleSlideSwitch: (switchId: string) => void;
  setButtonPressed: (buttonId: string, pressed: boolean) => void;
  toggleButtonLatch: (buttonId: string) => void;
  addWire: (fromSocketId: string, toSocketId: string, color?: string) => boolean;
  removeWire: (wireId: string) => void;
  clearWires: () => void;
  setActiveWireColor: (hex: string) => void;
  setAutoCycleWireColor: (enabled: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  triggerCameraReset: () => void;
  setTtlFloatingIsHigh: (enabled: boolean) => void;
  toggleSound: () => void;
  setHoveredSocketId: (socketId: string | null) => void;
  setHoveredStandbyModuleId: (moduleId: string | null) => void;
  resetInputs: () => void;
  exportCircuitJSON: () => string;
  importCircuitJSON: (json: string) => { ok: boolean; error?: string };
  resetBoard: () => void;
}

function makeDefaultSwitches(): Record<string, boolean> {
  return Object.fromEntries(SLIDE_SWITCHES.map((s) => [s.id, false]));
}

function makeDefaultButtons(): Record<string, boolean> {
  return Object.fromEntries(BUTTON_SWITCHES.map((b) => [b.id, false]));
}

function computeDerived(
  switches: Record<string, boolean>,
  buttons: Record<string, boolean>,
  wires: WireSpec[],
  ttlFloatingIsHigh: boolean
) {
  const res = runSimulation({ switches, buttons, wires, ttlFloatingIsHigh });
  return {
    netStates: res.netStates,
    socketStates: res.socketStates,
    ledStates: res.ledStates,
    conflicts: res.conflicts,
  };
}

let wireCounter = 1;

const initialSwitches = makeDefaultSwitches();
const initialButtons = makeDefaultButtons();
const initialDerived = computeDerived(initialSwitches, initialButtons, [], false);

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  switches: initialSwitches,
  buttons: initialButtons,
  latchedButtons: makeDefaultButtons(),
  wires: [],
  activeWireColor: WIRE_COLORS[0].hex,
  autoCycleWireColor: true,
  wireColorIndex: 0,
  cameraMode: '3d',
  cameraResetCount: 0,
  ttlFloatingIsHigh: false,
  soundEnabled: true,
  hoveredSocketId: null,
  hoveredStandbyModuleId: null,
  ...initialDerived,

  toggleSlideSwitch: (switchId) => {
    const s = get();
    if (!(switchId in s.switches)) return;
    const switches = { ...s.switches, [switchId]: !s.switches[switchId] };
    set({
      switches,
      ...computeDerived(switches, s.buttons, s.wires, s.ttlFloatingIsHigh),
    });
  },

  setButtonPressed: (buttonId, pressed) => {
    const s = get();
    if (!(buttonId in s.buttons)) return;
    const effective = pressed || Boolean(s.latchedButtons[buttonId]);
    if (s.buttons[buttonId] === effective) return;
    const buttons = { ...s.buttons, [buttonId]: effective };
    set({
      buttons,
      ...computeDerived(s.switches, buttons, s.wires, s.ttlFloatingIsHigh),
    });
  },

  toggleButtonLatch: (buttonId) => {
    const s = get();
    if (!(buttonId in s.buttons)) return;
    const nextLatch = !s.latchedButtons[buttonId];
    const latchedButtons = { ...s.latchedButtons, [buttonId]: nextLatch };
    const buttons = { ...s.buttons, [buttonId]: nextLatch };
    set({
      latchedButtons,
      buttons,
      ...computeDerived(s.switches, buttons, s.wires, s.ttlFloatingIsHigh),
    });
  },

  addWire: (fromSocketId, toSocketId, color) => {
    const s = get();
    if (fromSocketId === toSocketId) return false;
    if (!SOCKET_MAP[fromSocketId] || !SOCKET_MAP[toSocketId]) return false;

    // Prevent duplicate wires connecting the exact same two sockets
    const exists = s.wires.some(
      (w) =>
        (w.fromSocketId === fromSocketId && w.toSocketId === toSocketId) ||
        (w.fromSocketId === toSocketId && w.toSocketId === fromSocketId)
    );
    if (exists) return false;

    const chosenColor = color ?? s.activeWireColor;
    const nextWire: WireSpec = {
      id: `W${Date.now()}_${wireCounter++}`,
      fromSocketId,
      toSocketId,
      color: chosenColor,
    };
    const wires = [...s.wires, nextWire];
    const nextColorIdx = (s.wireColorIndex + 1) % WIRE_COLORS.length;
    set({
      wires,
      wireColorIndex: s.autoCycleWireColor ? nextColorIdx : s.wireColorIndex,
      activeWireColor: s.autoCycleWireColor ? WIRE_COLORS[nextColorIdx].hex : s.activeWireColor,
      ...computeDerived(s.switches, s.buttons, wires, s.ttlFloatingIsHigh),
    });
    return true;
  },

  removeWire: (wireId) => {
    const s = get();
    const wires = s.wires.filter((w) => w.id !== wireId);
    if (wires.length === s.wires.length) return;
    set({
      wires,
      ...computeDerived(s.switches, s.buttons, wires, s.ttlFloatingIsHigh),
    });
  },

  clearWires: () => {
    const s = get();
    set({
      wires: [],
      ...computeDerived(s.switches, s.buttons, [], s.ttlFloatingIsHigh),
    });
  },

  setActiveWireColor: (hex) => set({ activeWireColor: hex }),
  setAutoCycleWireColor: (enabled) => set({ autoCycleWireColor: enabled }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  triggerCameraReset: () => set((s) => ({ cameraResetCount: s.cameraResetCount + 1 })),

  setTtlFloatingIsHigh: (enabled) => {
    const s = get();
    set({
      ttlFloatingIsHigh: enabled,
      ...computeDerived(s.switches, s.buttons, s.wires, enabled),
    });
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  setHoveredSocketId: (socketId) =>
    set((s) => ({
      hoveredSocketId: socketId,
      hoveredStandbyModuleId: socketId ? null : s.hoveredStandbyModuleId,
    })),

  setHoveredStandbyModuleId: (moduleId) => set({ hoveredStandbyModuleId: moduleId }),

  resetInputs: () => {
    const s = get();
    const switches = makeDefaultSwitches();
    const buttons = makeDefaultButtons();
    set({
      switches,
      buttons,
      latchedButtons: makeDefaultButtons(),
      ...computeDerived(switches, buttons, s.wires, s.ttlFloatingIsHigh),
    });
  },

  exportCircuitJSON: () => {
    const s = get();
    const payload: SerializableCircuit = {
      version: 1,
      switches: { ...s.switches },
      buttons: { ...s.buttons },
      wires: s.wires.map((w) => ({ ...w })),
    };
    return JSON.stringify(payload, null, 2);
  },

  importCircuitJSON: (json) => {
    try {
      const parsed = JSON.parse(json) as Partial<SerializableCircuit>;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.wires)) {
        return { ok: false, error: 'Invalid circuit JSON structure.' };
      }
      const switches = makeDefaultSwitches();
      if (parsed.switches && typeof parsed.switches === 'object') {
        for (const k of Object.keys(switches)) {
          if (typeof parsed.switches[k] === 'boolean') switches[k] = parsed.switches[k];
        }
      }
      const buttons = makeDefaultButtons();
      if (parsed.buttons && typeof parsed.buttons === 'object') {
        for (const k of Object.keys(buttons)) {
          if (typeof parsed.buttons[k] === 'boolean') buttons[k] = parsed.buttons[k];
        }
      }
      const validWires: WireSpec[] = [];
      for (const w of parsed.wires) {
        if (
          w &&
          typeof w.fromSocketId === 'string' &&
          typeof w.toSocketId === 'string' &&
          w.fromSocketId !== w.toSocketId &&
          SOCKET_MAP[w.fromSocketId] &&
          SOCKET_MAP[w.toSocketId] &&
          !validWires.some(
            (vw) =>
              (vw.fromSocketId === w.fromSocketId && vw.toSocketId === w.toSocketId) ||
              (vw.fromSocketId === w.toSocketId && vw.toSocketId === w.fromSocketId)
          )
        ) {
          validWires.push({
            id: typeof w.id === 'string' && w.id ? w.id : `W_${wireCounter++}`,
            fromSocketId: w.fromSocketId,
            toSocketId: w.toSocketId,
            color: typeof w.color === 'string' && w.color ? w.color : WIRE_COLORS[0].hex,
          });
        }
      }
      const s = get();
      set({
        switches,
        buttons,
        latchedButtons: { ...buttons },
        wires: validWires,
        ...computeDerived(switches, buttons, validWires, s.ttlFloatingIsHigh),
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'JSON parse error.' };
    }
  },

  resetBoard: () => {
    const s = get();
    const switches = makeDefaultSwitches();
    const buttons = makeDefaultButtons();
    set({
      switches,
      buttons,
      latchedButtons: makeDefaultButtons(),
      wires: [],
      ...computeDerived(switches, buttons, [], s.ttlFloatingIsHigh),
    });
  },
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).useSimulatorStore = useSimulatorStore;
}
