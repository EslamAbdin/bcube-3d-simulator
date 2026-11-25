/* =========================================================================
   bCube Simulator Zustand Store — Serializable Circuit State & Logic Sync
   ========================================================================= */

import { create } from 'zustand';
import { PRESET_CIRCUITS } from '../data/presetCircuits';
import {
  BUTTON_SWITCHES,
  SLIDE_SWITCHES,
  SOCKET_MAP,
  type ActiveGateModuleType,
} from '../schema/boardSchema';
import {
  runSimulation,
  type ConflictInfo,
  type LedOutputState,
  type WireSpec,
} from '../engine/LogicEngine';
import type { SignalLevel } from '../engine/gateEvaluators';
import {
  analyzeWiringErrors,
  type WiringDiagnostic,
} from '../engine/wiringDiagnostics';

export type CameraMode = '3d' | '2d';
export type DrawerTab = 'truth-table' | 'timing' | 'challenges' | null;
export type PerformanceMode = 'high' | 'eco';
export type TeachingLanguage = 'en' | 'ar';
export type TouchTwoFingerMode = 'orbit' | 'pan';

const PERF_MODE_STORAGE_KEY = 'bcube_perf_mode_v1';
const TEACHING_LANG_STORAGE_KEY = 'bcube_teaching_lang_v1';
const ERC_ENABLED_STORAGE_KEY = 'bcube_erc_enabled_v1';

function readInitialErcEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(ERC_ENABLED_STORAGE_KEY);
    if (saved === 'false') return false;
    if (saved === 'true') return true;
    return true;
  } catch {
    return true;
  }
}

function persistErcEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ERC_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage quota/privacy mode failures
  }
}

function readInitialTeachingLang(): TeachingLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(TEACHING_LANG_STORAGE_KEY);
    return saved === 'ar' || saved === 'en' ? saved : 'en';
  } catch {
    return 'en';
  }
}

function persistTeachingLang(lang: TeachingLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TEACHING_LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage quota/privacy mode failures
  }
}

function readInitialPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'high';
  try {
    const saved = window.localStorage.getItem(PERF_MODE_STORAGE_KEY);
    if (saved === 'eco' || saved === 'high') {
      return saved;
    }
    const isMobileDevice =
      Boolean(window.matchMedia?.('(pointer: coarse)').matches) ||
      window.innerWidth < 900 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return isMobileDevice ? 'eco' : 'high';
  } catch {
    return 'high';
  }
}

function persistPerformanceMode(mode: PerformanceMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERF_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage quota/privacy mode failures
  }
}

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

export interface ActivePresetInfo {
  id: string;
  name: string;
  description: string;
  controlsHint: string;
}

export interface StatusToast {
  id: number;
  message: string;
  kind: 'info' | 'warning' | 'success';
}

interface CompactHashCircuit {
  v: number;
  s?: string[];
  b?: string[];
  w: Array<[string, string, string?]>;
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
  pendingSocketId: string | null;
  selectedWireId: string | null;
  activePresetInfo: ActivePresetInfo | null;
  statusToast: StatusToast | null;
  signalFlowEnabled: boolean;
  activeDrawerTab: DrawerTab;
  helpModalOpen: boolean;
  performanceMode: PerformanceMode;
  teachingMode: boolean;
  teachingLang: TeachingLanguage;
  inspectedIcType: ActiveGateModuleType | null;
  hoveredIcType: ActiveGateModuleType | null;
  errorWarningsEnabled: boolean;
  highlightedDiagnosticId: string | null;
  touchTwoFingerMode: TouchTwoFingerMode;

  // Derived simulation state
  netStates: Record<string, SignalLevel>;
  socketStates: Record<string, SignalLevel>;
  ledStates: Record<string, LedOutputState>;
  conflicts: ConflictInfo[];
  wiringDiagnostics: WiringDiagnostic[];

  // Actions
  toggleSlideSwitch: (switchId: string) => void;
  setButtonPressed: (buttonId: string, pressed: boolean) => void;
  toggleButtonLatch: (buttonId: string) => void;
  addWire: (fromSocketId: string, toSocketId: string, color?: string) => boolean;
  removeWire: (wireId: string) => void;
  clearWires: () => void;
  startWiring: (socketId: string) => void;
  cancelWiring: () => void;
  completeWiring: (targetSocketId: string) => { ok: boolean; reason?: 'self' | 'duplicate' | 'invalid' };
  selectWire: (wireId: string | null) => void;
  undoLastWire: () => boolean;
  setActiveWireColor: (hex: string) => void;
  setAutoCycleWireColor: (enabled: boolean) => void;
  toggleAutoCycleWireColor: () => void;
  setCameraMode: (mode: CameraMode) => void;
  triggerCameraReset: () => void;
  setTtlFloatingIsHigh: (enabled: boolean) => void;
  toggleSound: () => void;
  setHoveredSocketId: (socketId: string | null) => void;
  setHoveredStandbyModuleId: (moduleId: string | null) => void;
  resetInputs: () => void;
  applyInputVector: (inputBits: Record<string, 0 | 1>) => void;
  toggleSignalFlow: () => void;
  setActiveDrawerTab: (tab: DrawerTab) => void;
  toggleDrawerTab: (tab: Exclude<DrawerTab, null>) => void;
  setHelpModalOpen: (open: boolean) => void;
  togglePerformanceMode: () => void;
  toggleTeachingMode: () => void;
  setTeachingMode: (enabled: boolean) => void;
  setTeachingLang: (lang: TeachingLanguage) => void;
  setInspectedIcType: (icType: ActiveGateModuleType | null) => void;
  setHoveredIcType: (icType: ActiveGateModuleType | null) => void;
  toggleErrorWarnings: () => void;
  setHighlightedDiagnosticId: (diagId: string | null) => void;
  toggleTouchTwoFingerMode: () => void;
  loadTeachingDemo: (
    wires: WireSpec[],
    initialSwitches?: Record<string, boolean>,
    info?: ActivePresetInfo | null
  ) => void;
  loadPreset: (presetId: string) => boolean;
  dismissPresetInfo: () => void;
  showToast: (message: string, kind?: StatusToast['kind']) => void;
  clearToast: () => void;
  encodeCircuitToHash: () => string;
  loadCircuitFromHash: (hash: string) => { ok: boolean; error?: string };
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
  const wiringDiagnostics = analyzeWiringErrors(wires, res, { ttlFloatingIsHigh });
  return {
    netStates: res.netStates,
    socketStates: res.socketStates,
    ledStates: res.ledStates,
    conflicts: res.conflicts,
    wiringDiagnostics,
  };
}

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64url: string): string {
  const pad = (4 - (b64url.length % 4)) % 4;
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

let wireCounter = 1;
let toastCounter = 1;

function nextWireId(): string {
  return `W${Date.now()}_${wireCounter++}`;
}

function deduplicateValidWires(
  candidates: Array<{ id?: unknown; fromSocketId?: unknown; toSocketId?: unknown; color?: unknown }>
): WireSpec[] {
  const validWires: WireSpec[] = [];
  for (const w of candidates) {
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
        id: typeof w.id === 'string' && w.id ? w.id : nextWireId(),
        fromSocketId: w.fromSocketId,
        toSocketId: w.toSocketId,
        color: typeof w.color === 'string' && w.color ? w.color : WIRE_COLORS[0].hex,
      });
    }
  }
  return validWires;
}

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
  pendingSocketId: null,
  selectedWireId: null,
  activePresetInfo: null,
  statusToast: null,
  signalFlowEnabled: false,
  activeDrawerTab: null,
  helpModalOpen: false,
  performanceMode: readInitialPerformanceMode(),
  teachingMode: false,
  teachingLang: readInitialTeachingLang(),
  inspectedIcType: null,
  hoveredIcType: null,
  errorWarningsEnabled: readInitialErcEnabled(),
  highlightedDiagnosticId: null,
  touchTwoFingerMode: 'orbit',
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
    const fromSock = SOCKET_MAP[fromSocketId];
    const toSock = SOCKET_MAP[toSocketId];
    if (!fromSock || !toSock) return false;
    // Safeguard: dual-hole pairs on the same pin are already shorted internally
    if (fromSock.nodeId === toSock.nodeId) return false;

    const exists = s.wires.some(
      (w) =>
        (w.fromSocketId === fromSocketId && w.toSocketId === toSocketId) ||
        (w.fromSocketId === toSocketId && w.toSocketId === fromSocketId)
    );
    if (exists) return false;

    const chosenColor = color ?? s.activeWireColor;
    const nextWire: WireSpec = {
      id: nextWireId(),
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
      highlightedDiagnosticId: null,
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
      selectedWireId: s.selectedWireId === wireId ? null : s.selectedWireId,
      highlightedDiagnosticId: null,
      ...computeDerived(s.switches, s.buttons, wires, s.ttlFloatingIsHigh),
    });
  },

  clearWires: () => {
    const s = get();
    set({
      wires: [],
      pendingSocketId: null,
      selectedWireId: null,
      activePresetInfo: null,
      highlightedDiagnosticId: null,
      ...computeDerived(s.switches, s.buttons, [], s.ttlFloatingIsHigh),
    });
  },

  startWiring: (socketId) => {
    if (!SOCKET_MAP[socketId]) return;
    set({ pendingSocketId: socketId, selectedWireId: null });
  },

  cancelWiring: () => {
    const s = get();
    if (s.pendingSocketId === null && s.selectedWireId === null) return;
    set({ pendingSocketId: null, selectedWireId: null });
  },

  completeWiring: (targetSocketId) => {
    const s = get();
    const fromId = s.pendingSocketId;
    const fromSock = fromId ? SOCKET_MAP[fromId] : undefined;
    const toSock = SOCKET_MAP[targetSocketId];
    if (!fromId || !fromSock || !toSock) {
      set({ pendingSocketId: null });
      return { ok: false, reason: 'invalid' };
    }
    if (fromId === targetSocketId || fromSock.nodeId === toSock.nodeId) {
      set({
        pendingSocketId: null,
        statusToast: {
          id: toastCounter++,
          message:
            fromId === targetSocketId
              ? 'Cannot connect a socket to itself.'
              : 'Both holes belong to the same pin (already connected internally).',
          kind: 'warning',
        },
      });
      return { ok: false, reason: 'self' };
    }
    const exists = s.wires.some(
      (w) =>
        (w.fromSocketId === fromId && w.toSocketId === targetSocketId) ||
        (w.fromSocketId === targetSocketId && w.toSocketId === fromId)
    );
    if (exists) {
      set({
        pendingSocketId: null,
        statusToast: {
          id: toastCounter++,
          message: 'Wire already connects these two sockets.',
          kind: 'warning',
        },
      });
      return { ok: false, reason: 'duplicate' };
    }

    const ok = s.addWire(fromId, targetSocketId);
    set({ pendingSocketId: null, selectedWireId: null });
    return ok ? { ok: true } : { ok: false, reason: 'invalid' };
  },

  selectWire: (wireId) =>
    set((s) => ({
      selectedWireId: wireId,
      pendingSocketId: wireId ? null : s.pendingSocketId,
    })),

  undoLastWire: () => {
    const s = get();
    if (s.wires.length === 0) return false;
    const removed = s.wires[s.wires.length - 1];
    const wires = s.wires.slice(0, -1);
    set({
      wires,
      selectedWireId: s.selectedWireId === removed.id ? null : s.selectedWireId,
      highlightedDiagnosticId: null,
      ...computeDerived(s.switches, s.buttons, wires, s.ttlFloatingIsHigh),
    });
    return true;
  },

  setActiveWireColor: (hex) => {
    const idx = WIRE_COLORS.findIndex((c) => c.hex.toLowerCase() === hex.toLowerCase());
    set((s) => ({
      activeWireColor: hex,
      wireColorIndex: idx >= 0 ? idx : s.wireColorIndex,
    }));
  },

  setAutoCycleWireColor: (enabled) => set({ autoCycleWireColor: enabled }),
  toggleAutoCycleWireColor: () => set((s) => ({ autoCycleWireColor: !s.autoCycleWireColor })),
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

  applyInputVector: (inputBits) => {
    const s = get();
    const switches = { ...s.switches };
    const buttons = { ...s.buttons };
    const latchedButtons = { ...s.latchedButtons };
    for (const [id, bit] of Object.entries(inputBits)) {
      if (id in switches) {
        switches[id] = bit === 1;
      } else if (id in buttons) {
        const pressed = bit === 0;
        buttons[id] = pressed;
        latchedButtons[id] = pressed;
      }
    }
    set({
      switches,
      buttons,
      latchedButtons,
      ...computeDerived(switches, buttons, s.wires, s.ttlFloatingIsHigh),
    });
  },

  toggleSignalFlow: () => set((s) => ({ signalFlowEnabled: !s.signalFlowEnabled })),
  setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab }),
  toggleDrawerTab: (tab) =>
    set((s) => ({ activeDrawerTab: s.activeDrawerTab === tab ? null : tab })),
  setHelpModalOpen: (open) => set({ helpModalOpen: open }),

  togglePerformanceMode: () =>
    set((s) => {
      const next: PerformanceMode = s.performanceMode === 'high' ? 'eco' : 'high';
      persistPerformanceMode(next);
      return { performanceMode: next };
    }),

  toggleTeachingMode: () =>
    set((s) => {
      const next = !s.teachingMode;
      const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024;
      return {
        teachingMode: next,
        activeDrawerTab: next && isNarrow ? null : s.activeDrawerTab,
      };
    }),

  setTeachingMode: (enabled) => set({ teachingMode: enabled }),

  setTeachingLang: (lang) => {
    persistTeachingLang(lang);
    set({ teachingLang: lang });
  },

  setInspectedIcType: (icType) => set({ inspectedIcType: icType }),
  setHoveredIcType: (icType) => set({ hoveredIcType: icType }),

  toggleErrorWarnings: () =>
    set((s) => {
      const next = !s.errorWarningsEnabled;
      persistErcEnabled(next);
      return {
        errorWarningsEnabled: next,
        highlightedDiagnosticId: next ? s.highlightedDiagnosticId : null,
      };
    }),

  setHighlightedDiagnosticId: (diagId) => set({ highlightedDiagnosticId: diagId }),

  toggleTouchTwoFingerMode: () =>
    set((s) => ({
      touchTwoFingerMode: s.touchTwoFingerMode === 'orbit' ? 'pan' : 'orbit',
    })),

  loadTeachingDemo: (rawWires, initialSwitches, info = null) => {
    const s = get();
    const switches = makeDefaultSwitches();
    if (initialSwitches) {
      for (const [k, v] of Object.entries(initialSwitches)) {
        if (k in switches) switches[k] = Boolean(v);
      }
    }
    const buttons = makeDefaultButtons();
    const wires = deduplicateValidWires(rawWires);
    set({
      switches,
      buttons,
      latchedButtons: makeDefaultButtons(),
      wires,
      pendingSocketId: null,
      selectedWireId: null,
      highlightedDiagnosticId: null,
      activePresetInfo: info,
      ...computeDerived(switches, buttons, wires, s.ttlFloatingIsHigh),
    });
  },

  loadPreset: (presetId) => {
    if (presetId === 'empty') {
      get().resetBoard();
      set({
        statusToast: { id: toastCounter++, message: 'Cleared board.', kind: 'info' },
      });
      return true;
    }
    const preset = PRESET_CIRCUITS.find((p) => p.id === presetId);
    if (!preset) return false;

    const s = get();
    const switches = makeDefaultSwitches();
    if (preset.initialSwitches) {
      for (const [k, v] of Object.entries(preset.initialSwitches)) {
        if (k in switches) switches[k] = Boolean(v);
      }
    }
    const buttons = makeDefaultButtons();
    const wires = deduplicateValidWires(preset.wires);
    set({
      switches,
      buttons,
      latchedButtons: makeDefaultButtons(),
      wires,
      pendingSocketId: null,
      selectedWireId: null,
      highlightedDiagnosticId: null,
      activePresetInfo: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        controlsHint: preset.controlsHint,
      },
      statusToast: {
        id: toastCounter++,
        message: `Loaded preset: ${preset.name}`,
        kind: 'success',
      },
      ...computeDerived(switches, buttons, wires, s.ttlFloatingIsHigh),
    });
    return true;
  },

  dismissPresetInfo: () => set({ activePresetInfo: null }),

  showToast: (message, kind = 'info') =>
    set({
      statusToast: {
        id: toastCounter++,
        message,
        kind,
      },
    }),

  clearToast: () => set({ statusToast: null }),

  encodeCircuitToHash: () => {
    const s = get();
    const compact: CompactHashCircuit = {
      v: 1,
      s: Object.entries(s.switches)
        .filter(([, val]) => val)
        .map(([k]) => k),
      b: Object.entries(s.buttons)
        .filter(([, val]) => val)
        .map(([k]) => k),
      w: s.wires.map((w) => [w.fromSocketId, w.toSocketId, w.color]),
    };
    return `#circuit=${utf8ToBase64Url(JSON.stringify(compact))}`;
  },

  loadCircuitFromHash: (hash) => {
    try {
      const cleaned = hash.trim().replace(/^#/, '');
      const payloadPart = cleaned.startsWith('circuit=') ? cleaned.slice('circuit='.length) : cleaned;
      if (!payloadPart) {
        return { ok: false, error: 'Empty circuit hash.' };
      }
      const parsed = JSON.parse(base64UrlToUtf8(payloadPart)) as
        | Partial<CompactHashCircuit>
        | Partial<SerializableCircuit>;
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'Invalid circuit hash payload.' };
      }

      const switches = makeDefaultSwitches();
      const buttons = makeDefaultButtons();
      let wires: WireSpec[] = [];

      if ('w' in parsed && Array.isArray(parsed.w)) {
        if (Array.isArray(parsed.s)) {
          for (const k of parsed.s) {
            if (typeof k === 'string' && k in switches) switches[k] = true;
          }
        }
        if (Array.isArray(parsed.b)) {
          for (const k of parsed.b) {
            if (typeof k === 'string' && k in buttons) buttons[k] = true;
          }
        }
        wires = deduplicateValidWires(
          parsed.w.map((entry) =>
            Array.isArray(entry)
              ? { fromSocketId: entry[0], toSocketId: entry[1], color: entry[2] }
              : {}
          )
        );
      } else if ('wires' in parsed && Array.isArray(parsed.wires)) {
        if (parsed.switches && typeof parsed.switches === 'object') {
          for (const k of Object.keys(switches)) {
            if (typeof parsed.switches[k] === 'boolean') switches[k] = parsed.switches[k];
          }
        }
        if (parsed.buttons && typeof parsed.buttons === 'object') {
          for (const k of Object.keys(buttons)) {
            if (typeof parsed.buttons[k] === 'boolean') buttons[k] = parsed.buttons[k];
          }
        }
        wires = deduplicateValidWires(parsed.wires);
      } else {
        return { ok: false, error: 'Unsupported circuit hash structure.' };
      }

      const s = get();
      set({
        switches,
        buttons,
        latchedButtons: { ...buttons },
        wires,
        pendingSocketId: null,
        selectedWireId: null,
        highlightedDiagnosticId: null,
        activePresetInfo: null,
        statusToast: {
          id: toastCounter++,
          message: `Loaded shared circuit (${wires.length} ${wires.length === 1 ? 'wire' : 'wires'}).`,
          kind: 'success',
        },
        ...computeDerived(switches, buttons, wires, s.ttlFloatingIsHigh),
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid circuit link.' };
    }
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
      const validWires = deduplicateValidWires(parsed.wires);
      const s = get();
      set({
        switches,
        buttons,
        latchedButtons: { ...buttons },
        wires: validWires,
        pendingSocketId: null,
        selectedWireId: null,
        highlightedDiagnosticId: null,
        activePresetInfo: null,
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
      pendingSocketId: null,
      selectedWireId: null,
      highlightedDiagnosticId: null,
      activePresetInfo: null,
      ...computeDerived(switches, buttons, [], s.ttlFloatingIsHigh),
    });
  },
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).useSimulatorStore = useSimulatorStore;
}
