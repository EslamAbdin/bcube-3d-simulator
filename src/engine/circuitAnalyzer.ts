/* =========================================================================
   bCube Pure Circuit Analyzers — Auto Truth Table & Lab Challenge Grader
   Zero React or Three.js imports.
   ========================================================================= */

import {
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  SOCKET_MAP,
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
