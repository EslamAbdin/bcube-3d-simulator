import { describe, expect, it } from 'vitest';
import { LAB_CHALLENGES } from '../../data/labChallenges';
import { PRESET_CIRCUITS } from '../../data/presetCircuits';
import type { WireSpec } from '../LogicEngine';
import {
  formatTruthTableMarkdown,
  generateTruthTable,
  gradeChallenge,
} from '../circuitAnalyzer';

function toWires(
  pairs: Array<{ fromSocketId: string; toSocketId: string; color: string }>,
  prefix = 'T'
): WireSpec[] {
  return pairs.map((p, idx) => ({
    id: `${prefix}_${idx + 1}`,
    fromSocketId: p.fromSocketId,
    toSocketId: p.toSocketId,
    color: p.color,
  }));
}

describe('Milestone 5: CircuitAnalyzer (Truth Table & Auto-Grader)', () => {
  it('returns empty rows on an unwired board', () => {
    const table = generateTruthTable([]);
    expect(table.inputs).toHaveLength(0);
    expect(table.outputs).toHaveLength(0);
    expect(table.rows).toHaveLength(0);
    expect(table.truncated).toBe(false);
    expect(formatTruthTableMarkdown(table)).toBe('');
  });

  it('generates accurate 4-row truth table for Basic AND and Half Adder circuits', () => {
    const andPreset = PRESET_CIRCUITS.find((p) => p.id === 'basic-and')!;
    const andTable = generateTruthTable(toWires(andPreset.wires, 'AND'));
    expect(andTable.inputs.map((i) => i.id)).toEqual(['SW1', 'SW2']);
    expect(andTable.outputs.map((o) => o.id)).toEqual(['RED_D1']);
    expect(andTable.rows.map((r) => r.outputValues.RED_D1)).toEqual([
      'LOW',
      'LOW',
      'LOW',
      'HIGH',
    ]);

    const haPreset = PRESET_CIRCUITS.find((p) => p.id === 'half-adder')!;
    const haTable = generateTruthTable(toWires(haPreset.wires, 'HA'));
    expect(haTable.outputs.map((o) => o.id)).toEqual(['RED_D1', 'BLUE_D1']);
    expect(
      haTable.rows.map((r) => [r.outputValues.RED_D1, r.outputValues.BLUE_D1])
    ).toEqual([
      ['LOW', 'LOW'],
      ['HIGH', 'LOW'],
      ['HIGH', 'LOW'],
      ['LOW', 'HIGH'],
    ]);

    const md = formatTruthTableMarkdown(haTable);
    expect(md).toContain('| SW1 | SW2 | RED D1 | BLUE D1 |');
    expect(md).toContain('| 1 | 1 | 0 | 1 |');
  });

  it('handles > 4 connected inputs gracefully with truncated=true and 16 rows', () => {
    const manyWires: WireSpec[] = [
      { id: 'W1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'LED_RED:RED_D1:A', color: '#ef4444' },
      { id: 'W2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'LED_RED:RED_D2:A', color: '#eab308' },
      { id: 'W3', fromSocketId: 'SLIDE_SWITCH:SW3:A', toSocketId: 'LED_RED:RED_D3:A', color: '#22c55e' },
      { id: 'W4', fromSocketId: 'SLIDE_SWITCH:SW4:A', toSocketId: 'LED_RED:RED_D4:A', color: '#3b82f6' },
      { id: 'W5', fromSocketId: 'SLIDE_SWITCH:SW5:A', toSocketId: 'LED_RED:RED_D5:A', color: '#f97316' },
    ];
    const table = generateTruthTable(manyWires);
    expect(table.truncated).toBe(true);
    expect(table.totalConnectedInputs).toBe(5);
    expect(table.inputs).toHaveLength(4);
    expect(table.rows).toHaveLength(16);
    expect(table.truncatedNote).toContain('first 4 of 5');
  });

  it('grades all 5 Lab Challenges as PASS with valid wired circuits', () => {
    const solutions: Record<string, WireSpec[]> = {
      'challenge-1-and': toWires(PRESET_CIRCUITS.find((p) => p.id === 'basic-and')!.wires),
      'challenge-2-not': [
        { id: 'NOT_1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7404:PIN1:A', color: '#ef4444' },
        { id: 'NOT_2', fromSocketId: 'IC_7404:PIN2:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
      ],
      'challenge-3-xnor': toWires(PRESET_CIRCUITS.find((p) => p.id === 'xnor-gate')!.wires),
      'challenge-4-half-adder': toWires(PRESET_CIRCUITS.find((p) => p.id === 'half-adder')!.wires),
      'challenge-5-demorgan': toWires(PRESET_CIRCUITS.find((p) => p.id === 'demorgan-first')!.wires),
    };

    for (const challenge of LAB_CHALLENGES) {
      const res = gradeChallenge(challenge, solutions[challenge.id]);
      expect(res.passed).toBe(true);
      expect(res.failedCases).toHaveLength(0);
      expect(res.missingPins).toHaveLength(0);
      expect(res.hasConflict).toBe(false);
    }
  });

  it('grades wrong gate, missing output wire, and bus contention as FAIL with diagnostics', () => {
    const chAnd = LAB_CHALLENGES[0];
    const orWires = toWires(PRESET_CIRCUITS.find((p) => p.id === 'basic-or')!.wires);
    const wrongGateRes = gradeChallenge(chAnd, orWires);
    expect(wrongGateRes.passed).toBe(false);
    expect(wrongGateRes.failedCases.length).toBeGreaterThan(0);

    const chHalfAdder = LAB_CHALLENGES[3];
    const partialHaWires = toWires(
      PRESET_CIRCUITS.find((p) => p.id === 'half-adder')!.wires.slice(0, -1)
    );
    const missingOutRes = gradeChallenge(chHalfAdder, partialHaWires);
    expect(missingOutRes.passed).toBe(false);
    expect(missingOutRes.missingPins).toContain('BLUE_D1');

    const conflictWires: WireSpec[] = [
      ...toWires(PRESET_CIRCUITS.find((p) => p.id === 'basic-and')!.wires),
      { id: 'SHORT', fromSocketId: 'SLIDE_SWITCH:SW3:A', toSocketId: 'LED_RED:RED_D1:B', color: '#1e293b' },
    ];
    const conflictRes = gradeChallenge(chAnd, conflictWires);
    expect(conflictRes.passed).toBe(false);
    expect(conflictRes.hasConflict).toBe(true);
  });
});
