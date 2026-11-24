/* =========================================================================
   bCube Logic Simulation Engine — Union-Find Nets + Iterative Convergence
   Zero React or Three.js imports.
   ========================================================================= */

import {
  ALL_MODULES,
  ALL_SOCKETS,
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  SOCKET_MAP,
  type ActiveGateModuleType,
} from '../schema/boardSchema';
import { gateEvaluators, type LogicLevel, type SignalLevel } from './gateEvaluators';

export interface WireSpec {
  id: string;
  fromSocketId: string;
  toSocketId: string;
  color: string;
}

export interface SimulationInput {
  /** Slide switches: true = ON (+5V HIGH), false = OFF (GND LOW) */
  switches: Record<string, boolean>;
  /** Button switches: true = pressed (Active-Low -> LOW), false = released (HIGH) */
  buttons: Record<string, boolean>;
  wires: WireSpec[];
  ttlFloatingIsHigh?: boolean;
}

export interface DriverRecord {
  socketId: string;
  label: string;
  level: LogicLevel;
}

export interface ConflictInfo {
  netId: string;
  socketIds: string[];
  labels: string[];
  drivers: DriverRecord[];
}

export interface LedOutputState {
  id: string;
  bank: 'red' | 'blue';
  signal: SignalLevel;
  lit: boolean;
  error: boolean;
}

export interface SimulationResult {
  /** Signal level keyed by merged root net ID */
  netStates: Record<string, SignalLevel>;
  /** Signal level keyed by individual socket ID */
  socketStates: Record<string, SignalLevel>;
  /** Output status per RED_D1..8 & BLUE_D1..8 */
  ledStates: Record<string, LedOutputState>;
  conflicts: ConflictInfo[];
  converged: boolean;
  iterations: number;
}

/** Disjoint-Set (Union-Find) mapping every socket ID to its electrical net root. */
class UnionFind {
  private parent: Record<string, string> = {};

  constructor(ids: string[]) {
    for (const id of ids) this.parent[id] = id;
  }

  find(x: string): string {
    if (!(x in this.parent)) this.parent[x] = x;
    let r = x;
    while (this.parent[r] !== r) r = this.parent[r];
    let cur = x;
    while (this.parent[cur] !== r) {
      const nxt = this.parent[cur];
      this.parent[cur] = r;
      cur = nxt;
    }
    return r;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      // Deterministically pick lexicographically smaller root for stable test assertions
      if (ra < rb) this.parent[rb] = ra;
      else this.parent[ra] = rb;
    }
  }
}

const MAX_ITERATIONS = 50;

export function runSimulation(input: SimulationInput): SimulationResult {
  const ttlFloatingIsHigh = Boolean(input.ttlFloatingIsHigh);
  const allSocketIds = ALL_SOCKETS.map((s) => s.id);
  const uf = new UnionFind(allSocketIds);

  // 1. Short internal dual-hole pairs (hole A <-> hole B sharing exact nodeId)
  const firstSocketByNode: Record<string, string> = {};
  for (const sock of ALL_SOCKETS) {
    const prev = firstSocketByNode[sock.nodeId];
    if (prev) uf.union(prev, sock.id);
    else firstSocketByNode[sock.nodeId] = sock.id;
  }

  // 2. Merge user wires
  for (const w of input.wires) {
    if (SOCKET_MAP[w.fromSocketId] && SOCKET_MAP[w.toSocketId]) {
      uf.union(w.fromSocketId, w.toSocketId);
    }
  }

  // Group socket IDs by root net
  const netMembers: Record<string, string[]> = {};
  for (const sock of ALL_SOCKETS) {
    const root = uf.find(sock.id);
    if (!netMembers[root]) netMembers[root] = [];
    netMembers[root].push(sock.id);
  }
  const allRoots = Object.keys(netMembers);

  // Precompute static IO source drivers (Slide Switches & Active-Low Buttons)
  const ioDrivers: Array<{ root: string; rec: DriverRecord }> = [];
  for (const sw of SLIDE_SWITCHES) {
    const isOn = Boolean(input.switches[sw.id]);
    const level: LogicLevel = isOn ? 'HIGH' : 'LOW';
    ioDrivers.push({
      root: uf.find(sw.socketIds[0]),
      rec: { socketId: sw.socketIds[0], label: `${sw.id} (${isOn ? 'ON' : 'OFF'})`, level },
    });
  }
  for (const btn of BUTTON_SWITCHES) {
    const isPressed = Boolean(input.buttons[btn.id]);
    // Buttons are Active-Low: pressed = LOW, released = HIGH
    const level: LogicLevel = isPressed ? 'LOW' : 'HIGH';
    ioDrivers.push({
      root: uf.find(btn.socketIds[0]),
      rec: { socketId: btn.socketIds[0], label: `${btn.id} (${isPressed ? 'PRESSED' : 'RELEASED'})`, level },
    });
  }

  // Track active center gate modules
  const activeGateModules = ALL_MODULES.filter(
    (m) => m.zone === 'center_grid' && m.status === 'active' && m.gates && m.gates.length > 0
  );

  // Initialize net states & iterative gate output map
  const netStates: Record<string, SignalLevel> = {};
  for (const r of allRoots) netStates[r] = 'FLOATING';

  // Map output pin socketId -> SignalLevel
  const gateOutValues: Record<string, SignalLevel> = {};
  let conflicts: ConflictInfo[] = [];
  let converged = false;
  let iterations = 0;

  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    iterations = iter;
    const driversByNet: Record<string, DriverRecord[]> = {};
    const conflictFlagByNet: Record<string, boolean> = {};

    const addDriver = (root: string, rec: DriverRecord) => {
      if (!driversByNet[root]) driversByNet[root] = [];
      driversByNet[root].push(rec);
    };

    for (const io of ioDrivers) {
      addDriver(io.root, io.rec);
    }

    // Add gate outputs from previous pass
    for (const mod of activeGateModules) {
      for (const gate of mod.gates!) {
        const outSockId = `${mod.id}:PIN${gate.outputPin}:A`;
        const val = gateOutValues[outSockId] ?? 'FLOATING';
        if (val === 'HIGH' || val === 'LOW') {
          addDriver(uf.find(outSockId), {
            socketId: outSockId,
            label: `${mod.shortLabel} G${gate.gateIndex} Pin ${gate.outputPin}`,
            level: val,
          });
        } else if (val === 'CONFLICT') {
          conflictFlagByNet[uf.find(outSockId)] = true;
        }
      }
    }

    // Resolve each net state & check bus contention
    const nextNetStates: Record<string, SignalLevel> = {};
    const nextConflicts: ConflictInfo[] = [];

    for (const root of allRoots) {
      const drivers = driversByNet[root] ?? [];
      let sawHigh = false;
      let sawLow = false;
      for (const d of drivers) {
        if (d.level === 'HIGH') sawHigh = true;
        else if (d.level === 'LOW') sawLow = true;
      }

      let resolved: SignalLevel;
      if ((sawHigh && sawLow) || conflictFlagByNet[root]) {
        resolved = 'CONFLICT';
        nextConflicts.push({
          netId: root,
          socketIds: netMembers[root],
          labels: netMembers[root].map((sid) => SOCKET_MAP[sid]?.tooltip ?? sid),
          drivers,
        });
      } else if (sawHigh) {
        resolved = 'HIGH';
      } else if (sawLow) {
        resolved = 'LOW';
      } else {
        resolved = 'FLOATING';
      }
      nextNetStates[root] = resolved;
    }

    // Evaluate every gate in active center modules
    let changed = false;
    for (const root of allRoots) {
      if (netStates[root] !== nextNetStates[root]) {
        changed = true;
        netStates[root] = nextNetStates[root];
      }
    }

    for (const mod of activeGateModules) {
      const evaluator = gateEvaluators[mod.type as ActiveGateModuleType];
      if (!evaluator) continue;
      for (const gate of mod.gates!) {
        const inSignals = gate.inputPins.map((pin) => {
          const inSockId = `${mod.id}:PIN${pin}:A`;
          return nextNetStates[uf.find(inSockId)] ?? 'FLOATING';
        });
        const outVal = evaluator(inSignals, ttlFloatingIsHigh);
        const outKey = `${mod.id}:PIN${gate.outputPin}:A`;
        if (gateOutValues[outKey] !== outVal) {
          gateOutValues[outKey] = outVal;
          changed = true;
        }
      }
    }

    conflicts = nextConflicts;
    if (!changed) {
      converged = true;
      break;
    }
  }

  // Expand netStates -> individual socketStates
  const socketStates: Record<string, SignalLevel> = {};
  for (const sock of ALL_SOCKETS) {
    socketStates[sock.id] = netStates[uf.find(sock.id)] ?? 'FLOATING';
  }

  // Compute Red & Blue LED outputs (Common Cathode: HIGH = LIT)
  const ledStates: Record<string, LedOutputState> = {};
  for (const led of LED_INDICATORS) {
    const sig = socketStates[led.socketIds[0]] ?? 'FLOATING';
    ledStates[led.id] = {
      id: led.id,
      bank: led.bank,
      signal: sig,
      lit: sig === 'HIGH',
      error: sig === 'CONFLICT',
    };
  }

  return {
    netStates,
    socketStates,
    ledStates,
    conflicts,
    converged,
    iterations,
  };
}
