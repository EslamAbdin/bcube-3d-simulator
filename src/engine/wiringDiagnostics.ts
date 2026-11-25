/* =========================================================================
   bCube Pure Electrical & Logic Wiring Diagnostics Engine (ERC)
   Zero React or Three.js imports.
   ========================================================================= */

import {
  ALL_MODULES,
  ALL_SOCKETS,
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  SOCKET_MAP,
  type BoardModuleSpec,
  type GateInstanceSpec,
} from '../schema/boardSchema';
import type { SimulationResult, WireSpec } from './LogicEngine';

export type DiagnosticCode =
  | 'OUTPUT_TO_OUTPUT'
  | 'MULTIPLE_SWITCHES_ON_NET'
  | 'SWITCH_TO_OUTPUT'
  | 'SAME_GATE_INPUTS_SHORTED'
  | 'COMBINATIONAL_FEEDBACK_LOOP'
  | 'UNCONNECTED_GATE_INPUT'
  | 'UNDRIVEN_LED';

export type DiagnosticSeverity = 'error' | 'warning';

export interface WiringDiagnostic {
  id: string;
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  title: string;
  message: string;
  affectedWireIds: string[];
  affectedSocketIds: string[];
}

export interface AnalyzeWiringOptions {
  ttlFloatingIsHigh?: boolean;
}

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
      if (ra < rb) this.parent[rb] = ra;
      else this.parent[ra] = rb;
    }
  }
}

interface NetControlInfo {
  id: string;
  label: string;
  socketId: string;
}

interface NetGateOutputInfo {
  gateKey: string;
  mod: BoardModuleSpec;
  gate: GateInstanceSpec;
  label: string;
  socketId: string;
}

interface NetGateInputInfo {
  gateKey: string;
  mod: BoardModuleSpec;
  gate: GateInstanceSpec;
  pinNumber: number;
  label: string;
  socketId: string;
}

interface NetLedInfo {
  id: string;
  label: string;
  socketId: string;
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items));
}

/**
 * Analyzes the user's wired circuit structurally and electrically to surface
 * hardware-short hazards (errors) and combinational wiring pitfalls (warnings).
 */
export function analyzeWiringErrors(
  wires: WireSpec[],
  simResult: SimulationResult,
  _options: AnalyzeWiringOptions = {}
): WiringDiagnostic[] {
  if (wires.length === 0) return [];

  const allSocketIds = ALL_SOCKETS.map((s) => s.id);
  const uf = new UnionFind(allSocketIds);

  // Merge dual-hole pairs per nodeId
  const firstByNode: Record<string, string> = {};
  for (const sock of ALL_SOCKETS) {
    const prev = firstByNode[sock.nodeId];
    if (prev) uf.union(prev, sock.id);
    else firstByNode[sock.nodeId] = sock.id;
  }

  // Merge valid user jumper wires
  const validWires: WireSpec[] = [];
  for (const w of wires) {
    if (SOCKET_MAP[w.fromSocketId] && SOCKET_MAP[w.toSocketId]) {
      uf.union(w.fromSocketId, w.toSocketId);
      validWires.push(w);
    }
  }

  // Index wires & sockets per merged electrical net root
  const netWiresByRoot: Record<string, WireSpec[]> = {};
  const netSocketIdsByRoot: Record<string, string[]> = {};

  for (const sock of ALL_SOCKETS) {
    const root = uf.find(sock.id);
    if (!netSocketIdsByRoot[root]) netSocketIdsByRoot[root] = [];
    netSocketIdsByRoot[root].push(sock.id);
  }
  for (const w of validWires) {
    const root = uf.find(w.fromSocketId);
    if (!netWiresByRoot[root]) netWiresByRoot[root] = [];
    netWiresByRoot[root].push(w);
  }

  // Catalog active switches/buttons, LEDs, and center logic gates per merged net
  const controlsByNet: Record<string, NetControlInfo[]> = {};
  const gateOutputsByNet: Record<string, NetGateOutputInfo[]> = {};
  const gateInputsByNet: Record<string, NetGateInputInfo[]> = {};
  const ledsByNet: Record<string, NetLedInfo[]> = {};

  for (const sw of SLIDE_SWITCHES) {
    const sockId = sw.socketIds[0];
    const root = uf.find(sockId);
    if (!controlsByNet[root]) controlsByNet[root] = [];
    controlsByNet[root].push({ id: sw.id, label: sw.id, socketId: sockId });
  }
  for (const btn of BUTTON_SWITCHES) {
    const sockId = btn.socketIds[0];
    const root = uf.find(sockId);
    if (!controlsByNet[root]) controlsByNet[root] = [];
    controlsByNet[root].push({ id: btn.id, label: btn.id, socketId: sockId });
  }
  for (const led of LED_INDICATORS) {
    const sockId = led.socketIds[0];
    const root = uf.find(sockId);
    if (!ledsByNet[root]) ledsByNet[root] = [];
    ledsByNet[root].push({ id: led.id, label: led.id.replace('_', ' '), socketId: sockId });
  }

  const activeGateModules = ALL_MODULES.filter(
    (m) => m.zone === 'center_grid' && m.status === 'active' && m.gates && m.gates.length > 0
  );

  interface GateNodeRecord {
    gateKey: string;
    mod: BoardModuleSpec;
    gate: GateInstanceSpec;
    outRoot: string;
    outSockId: string;
    inRoots: Array<{ pin: number; root: string; sockId: string }>;
  }
  const gateNodes: GateNodeRecord[] = [];
  const gateNodeByKey: Record<string, GateNodeRecord> = {};

  for (const mod of activeGateModules) {
    for (const gate of mod.gates!) {
      const gateKey = `${mod.id}:G${gate.gateIndex}`;
      const outSockId = `${mod.id}:PIN${gate.outputPin}:A`;
      const outRoot = uf.find(outSockId);
      if (!gateOutputsByNet[outRoot]) gateOutputsByNet[outRoot] = [];
      gateOutputsByNet[outRoot].push({
        gateKey,
        mod,
        gate,
        label: `${mod.shortLabel} Pin ${gate.outputPin}`,
        socketId: outSockId,
      });

      const inRoots: GateNodeRecord['inRoots'] = [];
      for (const pinNum of gate.inputPins) {
        const inSockId = `${mod.id}:PIN${pinNum}:A`;
        const inRoot = uf.find(inSockId);
        inRoots.push({ pin: pinNum, root: inRoot, sockId: inSockId });
        if (!gateInputsByNet[inRoot]) gateInputsByNet[inRoot] = [];
        gateInputsByNet[inRoot].push({
          gateKey,
          mod,
          gate,
          pinNumber: pinNum,
          label: `${mod.shortLabel} Pin ${pinNum}`,
          socketId: inSockId,
        });
      }

      const rec: GateNodeRecord = { gateKey, mod, gate, outRoot, outSockId, inRoots };
      gateNodes.push(rec);
      gateNodeByKey[gateKey] = rec;
    }
  }

  const diagnostics: WiringDiagnostic[] = [];
  const seenIds = new Set<string>();
  const pushDiag = (diag: WiringDiagnostic) => {
    if (seenIds.has(diag.id)) return;
    seenIds.add(diag.id);
    diagnostics.push(diag);
  };

  // Rules 1, 2, 3, and 6 — Per wired net inspections
  for (const [root, netWires] of Object.entries(netWiresByRoot)) {
    if (netWires.length === 0) continue;

    const netWireIds = netWires.map((w) => w.id);
    const netWireSockets = uniq(netWires.flatMap((w) => [w.fromSocketId, w.toSocketId]));
    const controls = controlsByNet[root] ?? [];
    const outputs = gateOutputsByNet[root] ?? [];
    const inputs = gateInputsByNet[root] ?? [];
    const leds = ledsByNet[root] ?? [];

    // 1. OUTPUT_TO_OUTPUT (error)
    if (outputs.length >= 2) {
      const outLabels = outputs.map((o) => o.label);
      pushDiag({
        id: `OUTPUT_TO_OUTPUT:${root}`,
        code: 'OUTPUT_TO_OUTPUT',
        severity: 'error',
        title: 'Gate Output Shorted to Output',
        message: `${joinNatural(outLabels)} are wired to the same net — driving two gate outputs together causes bus contention even if both are currently LOW.`,
        affectedWireIds: netWireIds,
        affectedSocketIds: uniq([...netWireSockets, ...outputs.map((o) => o.socketId)]),
      });
    }

    // 2. MULTIPLE_SWITCHES_ON_NET (error)
    if (controls.length >= 2) {
      const ctrlLabels = controls.map((c) => c.label);
      const targetLabels = uniq([...inputs.map((i) => i.label), ...leds.map((l) => l.label)]);
      const targetClause =
        targetLabels.length > 0
          ? ` to ${joinNatural(targetLabels)}`
          : ' together on the same net';
      pushDiag({
        id: `MULTIPLE_SWITCHES_ON_NET:${root}`,
        code: 'MULTIPLE_SWITCHES_ON_NET',
        severity: 'error',
        title: 'Multiple Switches Driving One Net',
        message: `${joinNatural(ctrlLabels)} are both connected${targetClause} — connecting two switch sources to one net risks a power-to-ground short.`,
        affectedWireIds: netWireIds,
        affectedSocketIds: uniq([...netWireSockets, ...controls.map((c) => c.socketId)]),
      });
    }

    // 3. SWITCH_TO_OUTPUT (error)
    if (controls.length >= 1 && outputs.length >= 1) {
      const ctrlLabels = controls.map((c) => c.label);
      const outLabels = outputs.map((o) => o.label);
      pushDiag({
        id: `SWITCH_TO_OUTPUT:${root}`,
        code: 'SWITCH_TO_OUTPUT',
        severity: 'error',
        title: 'Switch Shorted to Gate Output',
        message: `${joinNatural(ctrlLabels)} is wired directly to gate output ${joinNatural(outLabels)} — a switch must feed gate inputs, never outputs.`,
        affectedWireIds: netWireIds,
        affectedSocketIds: uniq([
          ...netWireSockets,
          ...controls.map((c) => c.socketId),
          ...outputs.map((o) => o.socketId),
        ]),
      });
    }

    // 6. UNDRIVEN_LED (warning)
    if (leds.length >= 1 && controls.length === 0 && outputs.length === 0) {
      const ledLabels = leds.map((l) => l.label);
      pushDiag({
        id: `UNDRIVEN_LED:${root}`,
        code: 'UNDRIVEN_LED',
        severity: 'warning',
        title: 'Undriven LED Net',
        message: `${joinNatural(ledLabels)} ${leds.length === 1 ? 'has' : 'have'} a wire attached, but no switch, button, or gate output is driving this net.`,
        affectedWireIds: netWireIds,
        affectedSocketIds: uniq([...netWireSockets, ...leds.map((l) => l.socketId)]),
      });
    }
  }

  // Rule 4 — COMBINATIONAL_FEEDBACK_LOOP (warning): Tarjan SCC on active gate dependency graph
  const adj = new Map<string, Set<string>>();
  for (const g of gateNodes) adj.set(g.gateKey, new Set());

  for (const g of gateNodes) {
    const outWires = netWiresByRoot[g.outRoot];
    if (!outWires || outWires.length === 0) continue;
    const consumers = gateInputsByNet[g.outRoot] ?? [];
    for (const c of consumers) {
      adj.get(g.gateKey)!.add(c.gateKey);
    }
  }

  let indexCounter = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  const strongConnect = (v: string) => {
    indices.set(v, indexCounter);
    lowlink.set(v, indexCounter);
    indexCounter++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      sccs.push(comp);
    }
  };

  for (const g of gateNodes) {
    if (!indices.has(g.gateKey)) strongConnect(g.gateKey);
  }

  for (const comp of sccs) {
    const isSelfLoop = comp.length === 1 && adj.get(comp[0])?.has(comp[0]);
    if (comp.length < 2 && !isSelfLoop) continue;

    const compSet = new Set(comp);
    const loopWireIds: string[] = [];
    const loopSockets: string[] = [];
    const loopEdges: string[] = [];

    for (const key of comp) {
      const rec = gateNodeByKey[key];
      const outWires = netWiresByRoot[rec.outRoot] ?? [];
      const matchingConsumers = (gateInputsByNet[rec.outRoot] ?? []).filter((c) =>
        compSet.has(c.gateKey)
      );
      if (matchingConsumers.length > 0 && outWires.length > 0) {
        loopWireIds.push(...outWires.map((w) => w.id));
        loopSockets.push(rec.outSockId, ...matchingConsumers.map((c) => c.socketId));
        for (const c of matchingConsumers) {
          loopEdges.push(`${rec.mod.shortLabel} Pin ${rec.gate.outputPin} -> ${c.label}`);
        }
      }
    }

    const sortedKeys = [...comp].sort();
    pushDiag({
      id: `COMBINATIONAL_FEEDBACK_LOOP:${sortedKeys.join(',')}`,
      code: 'COMBINATIONAL_FEEDBACK_LOOP',
      severity: 'warning',
      title: 'Combinational Feedback Loop',
      message: `Gate output feeds back into its own input (${loopEdges.join(', ')}), creating an unstable combinational loop or oscillation.`,
      affectedWireIds: uniq(loopWireIds),
      affectedSocketIds: uniq(loopSockets),
    });
  }

  // Defensive check if LogicEngine did not converge without a static SCC already reported
  if (!simResult.converged && !diagnostics.some((d) => d.code === 'COMBINATIONAL_FEEDBACK_LOOP')) {
    pushDiag({
      id: 'COMBINATIONAL_FEEDBACK_LOOP:non-convergent',
      code: 'COMBINATIONAL_FEEDBACK_LOOP',
      severity: 'warning',
      title: 'Oscillating Feedback Loop',
      message: 'Circuit did not settle to a steady logic state — check for gate output-to-input loops.',
      affectedWireIds: validWires.map((w) => w.id),
      affectedSocketIds: uniq(validWires.flatMap((w) => [w.fromSocketId, w.toSocketId])),
    });
  }

  // Rule 5 — UNCONNECTED_GATE_INPUT (warning)
  for (const rec of gateNodes) {
    const wiredIn = rec.inRoots.filter((ir) => (netWiresByRoot[ir.root]?.length ?? 0) > 0);
    const missingIn = rec.inRoots.filter((ir) => (netWiresByRoot[ir.root]?.length ?? 0) === 0);
    const outWires = netWiresByRoot[rec.outRoot] ?? [];
    const outWired = outWires.length > 0;

    if ((wiredIn.length > 0 || outWired) && missingIn.length > 0) {
      const affectedWireIds = uniq([
        ...wiredIn.flatMap((ir) => (netWiresByRoot[ir.root] ?? []).map((w) => w.id)),
        ...(outWired ? outWires.map((w) => w.id) : []),
      ]);
      const affectedSocketIds = uniq([
        ...wiredIn.map((ir) => ir.sockId),
        ...(outWired ? [rec.outSockId] : []),
        ...missingIn.map((ir) => ir.sockId),
      ]);
      const missingPinsText = joinNatural(missingIn.map((ir) => `Pin ${ir.pin}`));

      pushDiag({
        id: `UNCONNECTED_GATE_INPUT:${rec.gateKey}`,
        code: 'UNCONNECTED_GATE_INPUT',
        severity: 'warning',
        title: 'Unconnected Gate Input',
        message: `${rec.mod.shortLabel} Gate ${rec.gate.gateIndex} is partially wired — ${missingPinsText} ${missingIn.length === 1 ? 'has' : 'have'} no wire attached.`,
        affectedWireIds,
        affectedSocketIds,
      });
    }
  }

  // Rule 5b — SAME_GATE_INPUTS_SHORTED (warning) for 2-input non-inverter gates (7408 AND, 7432 OR, 7486 XOR)
  for (const rec of gateNodes) {
    if (
      (rec.mod.type === 'IC_7408' || rec.mod.type === 'IC_7432' || rec.mod.type === 'IC_7486') &&
      rec.inRoots.length === 2 &&
      rec.inRoots[0].root === rec.inRoots[1].root
    ) {
      const sharedRoot = rec.inRoots[0].root;
      const sharedWires = netWiresByRoot[sharedRoot] ?? [];
      if (sharedWires.length > 0) {
        const behaviorHint =
          rec.mod.type === 'IC_7486'
            ? 'X ⊕ X is always 0 (LOW)'
            : rec.mod.type === 'IC_7408'
              ? 'X · X simplifies trivially to X'
              : 'X + X simplifies trivially to X';
        pushDiag({
          id: `SAME_GATE_INPUTS_SHORTED:${rec.gateKey}`,
          code: 'SAME_GATE_INPUTS_SHORTED',
          severity: 'warning',
          title: 'Same Gate Inputs Shorted Together',
          message: `${rec.mod.shortLabel} Gate ${rec.gate.gateIndex} inputs (Pin ${rec.inRoots[0].pin} and Pin ${rec.inRoots[1].pin}) are wired to the same net — ${behaviorHint}.`,
          affectedWireIds: sharedWires.map((w) => w.id),
          affectedSocketIds: uniq([
            rec.inRoots[0].sockId,
            rec.inRoots[1].sockId,
            ...sharedWires.flatMap((w) => [w.fromSocketId, w.toSocketId]),
          ]),
        });
      }
    }
  }

  // Sort errors first, then warnings, then deterministically by id
  diagnostics.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  return diagnostics;
}
