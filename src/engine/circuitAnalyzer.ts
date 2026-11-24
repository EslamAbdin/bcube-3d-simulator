/* =========================================================================
   bCube Pure Circuit Analyzers — Auto Truth Table & Lab Challenge Grader
   Zero React or Three.js imports.
   ========================================================================= */

import {
  ALL_MODULES,
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  SOCKET_MAP,
  type ActiveGateModuleType,
} from '../schema/boardSchema';
import type { SignalLevel } from './gateEvaluators';
import { runSimulation, type WireSpec } from './LogicEngine';

export interface AnalyzerInputPin {
  id: string;
  kind: 'switch' | 'button';
  label: string;
  shortLabel: string;
  activeLow: boolean;
}

export interface AnalyzerOutputPin {
  id: string;
  bank: 'red' | 'blue';
  label: string;
}

export interface TruthTableRow {
  index: number;
  inputValues: Record<string, 0 | 1>;
  outputValues: Record<string, SignalLevel>;
  hasConflict: boolean;
}

export interface TruthTableResult {
  inputs: AnalyzerInputPin[];
  outputs: AnalyzerOutputPin[];
  rows: TruthTableRow[];
  truncated: boolean;
  totalConnectedInputs: number;
  truncatedNote?: string;
}

export type ChallengeDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface LabChallengeSpec {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  objective: string;
  requiredInputs: string[];
  requiredOutputs: string[];
  suggestedICs: string[];
  hint: string;
  expectedOutputs: (inputBits: Record<string, 0 | 1>) => Record<string, 0 | 1>;
}

export interface ChallengeFailedCase {
  inputs: Record<string, 0 | 1>;
  expected: Record<string, 0 | 1>;
  actual: Record<string, SignalLevel>;
  hasConflict: boolean;
}

export interface ChallengeGradeResult {
  passed: boolean;
  scoreText: string;
  passedCount: number;
  totalCases: number;
  failedCases: ChallengeFailedCase[];
  missingPins: string[];
  hasConflict: boolean;
  hint: string;
}

function collectConnectedNodeIds(wires: WireSpec[]): Set<string> {
  const nodes = new Set<string>();
  for (const w of wires) {
    const sA = SOCKET_MAP[w.fromSocketId];
    const sB = SOCKET_MAP[w.toSocketId];
    if (!sA || !sB) continue;
    nodes.add(sA.nodeId);
    nodes.add(sB.nodeId);
  }
  return nodes;
}

function makeBaselineControls() {
  const switches: Record<string, boolean> = {};
  for (const sw of SLIDE_SWITCHES) switches[sw.id] = false;
  const buttons: Record<string, boolean> = {};
  for (const btn of BUTTON_SWITCHES) buttons[btn.id] = false;
  return { switches, buttons };
}

function applyBitVectorToControls(
  inputIds: string[],
  bits: Record<string, 0 | 1>,
  switches: Record<string, boolean>,
  buttons: Record<string, boolean>
) {
  for (const id of inputIds) {
    const bit = bits[id] ?? 0;
    if (id in switches) {
      switches[id] = bit === 1;
    } else if (id in buttons) {
      // Pushbuttons are Active-Low: bit 1 on pin = released (false), bit 0 on pin = pressed (true)
      buttons[id] = bit === 0;
    }
  }
}

export function signalToCellSymbol(sig: SignalLevel): '1' | '0' | 'Z' | 'ERR' {
  if (sig === 'HIGH') return '1';
  if (sig === 'LOW') return '0';
  if (sig === 'CONFLICT') return 'ERR';
  return 'Z';
}

/**
 * Discovers wired input controls and output LEDs and sweeps up to 2^4 = 16 states
 * purely in memory without mutating live simulator store state.
 */
export function generateTruthTable(
  wires: WireSpec[],
  options?: { ttlFloatingIsHigh?: boolean; maxInputs?: number }
): TruthTableResult {
  const ttlFloatingIsHigh = Boolean(options?.ttlFloatingIsHigh);
  const maxInputs = options?.maxInputs ?? 4;
  const connectedNodes = collectConnectedNodeIds(wires);

  const allConnectedInputs: AnalyzerInputPin[] = [];
  for (const sw of SLIDE_SWITCHES) {
    if (connectedNodes.has(sw.nodeId)) {
      allConnectedInputs.push({
        id: sw.id,
        kind: 'switch',
        label: sw.id,
        shortLabel: sw.id,
        activeLow: false,
      });
    }
  }
  for (const btn of BUTTON_SWITCHES) {
    if (connectedNodes.has(btn.nodeId)) {
      allConnectedInputs.push({
        id: btn.id,
        kind: 'button',
        label: `${btn.id} (Pin)`,
        shortLabel: btn.id,
        activeLow: true,
      });
    }
  }

  const outputs: AnalyzerOutputPin[] = [];
  for (const led of LED_INDICATORS) {
    if (connectedNodes.has(led.nodeId)) {
      outputs.push({
        id: led.id,
        bank: led.bank,
        label: led.id.replace('_', ' '),
      });
    }
  }

  const totalConnectedInputs = allConnectedInputs.length;
  const truncated = totalConnectedInputs > maxInputs;
  const inputs = truncated ? allConnectedInputs.slice(0, maxInputs) : allConnectedInputs;
  const truncatedNote = truncated
    ? `Showing first ${maxInputs} of ${totalConnectedInputs} connected inputs (<= 16 rows cap).`
    : undefined;

  if (inputs.length === 0 || outputs.length === 0) {
    return {
      inputs,
      outputs,
      rows: [],
      truncated,
      totalConnectedInputs,
      truncatedNote,
    };
  }

  const rows: TruthTableRow[] = [];
  const totalRows = 1 << inputs.length;
  const inputIds = inputs.map((i) => i.id);

  for (let mask = 0; mask < totalRows; mask++) {
    const { switches, buttons } = makeBaselineControls();
    const inputValues: Record<string, 0 | 1> = {};

    for (let i = 0; i < inputs.length; i++) {
      const bitPos = inputs.length - 1 - i;
      const bit: 0 | 1 = ((mask >> bitPos) & 1) === 1 ? 1 : 0;
      inputValues[inputs[i].id] = bit;
    }

    applyBitVectorToControls(inputIds, inputValues, switches, buttons);
    const sim = runSimulation({ switches, buttons, wires, ttlFloatingIsHigh });

    const outputValues: Record<string, SignalLevel> = {};
    for (const out of outputs) {
      outputValues[out.id] = sim.ledStates[out.id]?.signal ?? 'FLOATING';
    }

    rows.push({
      index: mask,
      inputValues,
      outputValues,
      hasConflict: sim.conflicts.length > 0,
    });
  }

  return {
    inputs,
    outputs,
    rows,
    truncated,
    totalConnectedInputs,
    truncatedNote,
  };
}

export interface TimingChannel {
  id: string;
  nodeId: string;
  kind: TimingChannelKind;
  label: string;
  subLabel: string;
  moduleId: string;
  bank?: 'red' | 'blue';
  activeLow?: boolean;
  samples: SignalLevel[];
}

export type TimingChannelKind = 'input' | 'gate_input' | 'gate_output' | 'output';

export interface TimingStep {
  index: number;
  label: string;
  inputValues: Record<string, 0 | 1>;
  hasConflict: boolean;
}

export interface TimingDiagramResult {
  inputs: AnalyzerInputPin[];
  channels: TimingChannel[];
  steps: TimingStep[];
  truncated: boolean;
  totalConnectedInputs: number;
  truncatedNote?: string;
}

const TIMING_CHIP_SHORT: Record<ActiveGateModuleType, string> = {
  IC_7400: '7400',
  IC_7402: '7402',
  IC_7404: '7404',
  IC_7408: '7408',
  IC_7432: '7432',
  IC_7486: '7486',
};

/**
 * Generates an aligned multi-channel timing waveform across all connected
 * input switches/buttons, active gate IC input/output pins, and output LEDs.
 */
export function generateTimingDiagram(
  wires: WireSpec[],
  options?: { ttlFloatingIsHigh?: boolean; maxInputs?: number }
): TimingDiagramResult {
  const ttlFloatingIsHigh = Boolean(options?.ttlFloatingIsHigh);
  const maxInputs = options?.maxInputs ?? 4;
  const connectedNodes = collectConnectedNodeIds(wires);

  const allConnectedInputs: AnalyzerInputPin[] = [];
  for (const sw of SLIDE_SWITCHES) {
    if (connectedNodes.has(sw.nodeId)) {
      allConnectedInputs.push({
        id: sw.id,
        kind: 'switch',
        label: sw.id,
        shortLabel: sw.id,
        activeLow: false,
      });
    }
  }
  for (const btn of BUTTON_SWITCHES) {
    if (connectedNodes.has(btn.nodeId)) {
      allConnectedInputs.push({
        id: btn.id,
        kind: 'button',
        label: btn.id,
        shortLabel: btn.id,
        activeLow: true,
      });
    }
  }

  const totalConnectedInputs = allConnectedInputs.length;
  const truncated = totalConnectedInputs > maxInputs;
  const inputs = truncated ? allConnectedInputs.slice(0, maxInputs) : allConnectedInputs;
  const truncatedNote = truncated
    ? `Showing first ${maxInputs} of ${totalConnectedInputs} connected inputs (<= 16 slots cap).`
    : undefined;

  if (inputs.length === 0) {
    return {
      inputs,
      channels: [],
      steps: [],
      truncated,
      totalConnectedInputs,
      truncatedNote,
    };
  }

  interface ChannelDescriptor {
    channel: TimingChannel;
    socketId?: string;
    ledId?: string;
  }

  const descriptors: ChannelDescriptor[] = [];

  for (const inp of inputs) {
    const sw = SLIDE_SWITCHES.find((s) => s.id === inp.id);
    const btn = BUTTON_SWITCHES.find((b) => b.id === inp.id);
    const socketId = sw?.socketIds[0] ?? btn?.socketIds[0];
    const nodeId = sw?.nodeId ?? btn?.nodeId ?? `NODE_${inp.id}`;
    descriptors.push({
      socketId,
      channel: {
        id: `IN:${inp.id}`,
        nodeId,
        kind: 'input',
        label: inp.label,
        subLabel: inp.activeLow ? 'Btn (Low)' : 'Switch',
        moduleId: inp.activeLow ? 'BUTTON_SWITCH' : 'SLIDE_SWITCH',
        activeLow: inp.activeLow,
        samples: [],
      },
    });
  }

  // Active IC gate input & output pins (for any gate having at least 1 connected pin)
  for (const mod of ALL_MODULES) {
    if (mod.zone !== 'center_grid' || mod.status !== 'active' || !mod.gates) continue;
    const gType = mod.type as ActiveGateModuleType;
    const chipCode = TIMING_CHIP_SHORT[gType];

    for (const gate of mod.gates) {
      const hasAnyPinWired =
        connectedNodes.has(`NODE_${mod.id}_PIN${gate.outputPin}`) ||
        gate.inputPins.some((p) => connectedNodes.has(`NODE_${mod.id}_PIN${p}`));
      if (!hasAnyPinWired) continue;

      gate.inputPins.forEach((pinNum, inIdx) => {
        const sockId = `${mod.id}:PIN${pinNum}:A`;
        const inRole =
          gate.inputPins.length === 1
            ? `G${gate.gateIndex} In`
            : `G${gate.gateIndex} In ${inIdx === 0 ? 'A' : 'B'}`;
        descriptors.push({
          socketId: sockId,
          channel: {
            id: `GATE:${mod.id}:PIN${pinNum}`,
            nodeId: `NODE_${mod.id}_PIN${pinNum}`,
            kind: 'gate_input',
            label: `${chipCode} P${pinNum}`,
            subLabel: inRole,
            moduleId: mod.id,
            samples: [],
          },
        });
      });

      const outSockId = `${mod.id}:PIN${gate.outputPin}:A`;
      descriptors.push({
        socketId: outSockId,
        channel: {
          id: `GATE:${mod.id}:PIN${gate.outputPin}`,
          nodeId: `NODE_${mod.id}_PIN${gate.outputPin}`,
          kind: 'gate_output',
          label: `${chipCode} P${gate.outputPin}`,
          subLabel: `G${gate.gateIndex} Out`,
          moduleId: mod.id,
          samples: [],
        },
      });
    }
  }

  // Output LED channels
  for (const led of LED_INDICATORS) {
    if (!connectedNodes.has(led.nodeId)) continue;
    descriptors.push({
      ledId: led.id,
      channel: {
        id: `OUT:${led.id}`,
        nodeId: led.nodeId,
        kind: 'output',
        label: led.id.replace('_', ' '),
        subLabel: led.bank === 'red' ? 'Red LED' : 'Blue LED',
        moduleId: led.bank === 'red' ? 'LED_RED' : 'LED_BLUE',
        bank: led.bank,
        samples: [],
      },
    });
  }

  // Sweep 4 clock slots [0,1,0,1] for 1 input, or full 2^n states for 2..4 inputs
  const vectors: Array<Record<string, 0 | 1>> = [];
  if (inputs.length === 1) {
    const onlyId = inputs[0].id;
    for (const bit of [0, 1, 0, 1] as const) {
      vectors.push({ [onlyId]: bit });
    }
  } else {
    const totalRows = 1 << inputs.length;
    for (let mask = 0; mask < totalRows; mask++) {
      const vec: Record<string, 0 | 1> = {};
      for (let i = 0; i < inputs.length; i++) {
        const bitPos = inputs.length - 1 - i;
        vec[inputs[i].id] = ((mask >> bitPos) & 1) === 1 ? 1 : 0;
      }
      vectors.push(vec);
    }
  }

  const inputIds = inputs.map((i) => i.id);
  const steps: TimingStep[] = [];

  vectors.forEach((inputValues, stepIdx) => {
    const { switches, buttons } = makeBaselineControls();
    applyBitVectorToControls(inputIds, inputValues, switches, buttons);
    const sim = runSimulation({ switches, buttons, wires, ttlFloatingIsHigh });

    steps.push({
      index: stepIdx,
      label: `t${stepIdx}`,
      inputValues,
      hasConflict: sim.conflicts.length > 0,
    });

    for (const desc of descriptors) {
      let sig: SignalLevel = 'FLOATING';
      if (desc.ledId) {
        sig = sim.ledStates[desc.ledId]?.signal ?? 'FLOATING';
      } else if (desc.socketId) {
        sig = sim.socketStates[desc.socketId] ?? 'FLOATING';
      }
      desc.channel.samples.push(sig);
    }
  });

  return {
    inputs,
    channels: descriptors.map((d) => d.channel),
    steps,
    truncated,
    totalConnectedInputs,
    truncatedNote,
  };
}

export function formatTruthTableMarkdown(table: TruthTableResult): string {
  if (table.inputs.length === 0 || table.outputs.length === 0 || table.rows.length === 0) {
    return '';
  }

  const headers = [
    ...table.inputs.map((i) => i.label),
    ...table.outputs.map((o) => o.label),
  ];
  const headerLine = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;

  const bodyLines = table.rows.map((row) => {
    const inCells = table.inputs.map((i) => String(row.inputValues[i.id] ?? 0));
    const outCells = table.outputs.map((o) => signalToCellSymbol(row.outputValues[o.id] ?? 'FLOATING'));
    return `| ${[...inCells, ...outCells].join(' | ')} |`;
  });

  return [headerLine, sepLine, ...bodyLines].join('\n');
}

/**
 * Auto-grades a student's wired circuit against a LabChallengeSpec.
 */
export function gradeChallenge(
  challenge: LabChallengeSpec,
  wires: WireSpec[],
  options?: { ttlFloatingIsHigh?: boolean }
): ChallengeGradeResult {
  const ttlFloatingIsHigh = Boolean(options?.ttlFloatingIsHigh);
  const connectedNodes = collectConnectedNodeIds(wires);

  const missingPins: string[] = [];
  for (const inId of challenge.requiredInputs) {
    const sw = SLIDE_SWITCHES.find((s) => s.id === inId);
    const btn = BUTTON_SWITCHES.find((b) => b.id === inId);
    const nodeId = sw?.nodeId ?? btn?.nodeId;
    if (!nodeId || !connectedNodes.has(nodeId)) {
      missingPins.push(inId);
    }
  }
  for (const outId of challenge.requiredOutputs) {
    const led = LED_INDICATORS.find((l) => l.id === outId);
    if (!led || !connectedNodes.has(led.nodeId)) {
      missingPins.push(outId);
    }
  }

  const n = challenge.requiredInputs.length;
  const totalCases = 1 << n;
  const failedCases: ChallengeFailedCase[] = [];
  let hasConflict = false;
  let passedCount = 0;

  for (let mask = 0; mask < totalCases; mask++) {
    const { switches, buttons } = makeBaselineControls();
    const inputBits: Record<string, 0 | 1> = {};

    for (let i = 0; i < n; i++) {
      const bitPos = n - 1 - i;
      const bit: 0 | 1 = ((mask >> bitPos) & 1) === 1 ? 1 : 0;
      inputBits[challenge.requiredInputs[i]] = bit;
    }

    applyBitVectorToControls(challenge.requiredInputs, inputBits, switches, buttons);
    const sim = runSimulation({ switches, buttons, wires, ttlFloatingIsHigh });
    const rowConflict = sim.conflicts.length > 0;
    if (rowConflict) hasConflict = true;

    const expected = challenge.expectedOutputs(inputBits);
    const actual: Record<string, SignalLevel> = {};
    let rowOk = !rowConflict;

    for (const outId of challenge.requiredOutputs) {
      const sig = sim.ledStates[outId]?.signal ?? 'FLOATING';
      actual[outId] = sig;
      const expectedSig: SignalLevel = expected[outId] === 1 ? 'HIGH' : 'LOW';
      if (sig !== expectedSig) {
        rowOk = false;
      }
    }

    if (rowOk) {
      passedCount++;
    } else {
      failedCases.push({
        inputs: inputBits,
        expected,
        actual,
        hasConflict: rowConflict,
      });
    }
  }

  const passed = missingPins.length === 0 && !hasConflict && failedCases.length === 0;
  const scoreText = `${passedCount} / ${totalCases} truth-table states matched`;

  return {
    passed,
    scoreText,
    passedCount,
    totalCases,
    failedCases,
    missingPins,
    hasConflict,
    hint: challenge.hint,
  };
}
