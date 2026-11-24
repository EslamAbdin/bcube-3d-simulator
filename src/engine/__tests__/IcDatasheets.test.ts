import { describe, expect, it } from 'vitest';
import {
  IC_DATASHEETS,
  IC_ORDER,
  getIcPinWireSummary,
} from '../../data/icDatasheets';
import { PRESET_CIRCUITS } from '../../data/presetCircuits';
import { runSimulation, type WireSpec } from '../LogicEngine';
import type { ActiveGateModuleType } from '../../schema/boardSchema';

describe('bCube DIP-14 IC Datasheets & Pinout Inspector', () => {
  it('defines complete DIP-14 schematics, equations, and power pins for all 6 active ICs', () => {
    expect(IC_ORDER).toHaveLength(6);

    for (const icType of IC_ORDER) {
      const spec = IC_DATASHEETS[icType];
      expect(spec.vccPin).toBe(14);
      expect(spec.gndPin).toBe(7);
      expect(spec.title.en.length).toBeGreaterThan(3);
      expect(spec.title.ar.length).toBeGreaterThan(3);
      expect(spec.wiringNote.en.length).toBeGreaterThan(5);
      expect(spec.wiringNote.ar.length).toBeGreaterThan(5);
      expect(spec.equationPlain.length).toBeGreaterThan(3);

      // Every pin 1..14 must be uniquely assigned across VCC, GND, and internal gates
      const coveredPins = new Set<number>([spec.vccPin, spec.gndPin]);
      for (const g of spec.internalGates) {
        g.inputPins.forEach((p) => coveredPins.add(p));
        coveredPins.add(g.outputPin);
      }
      expect(coveredPins.size).toBe(14);
      for (let p = 1; p <= 14; p++) {
        expect(coveredPins.has(p)).toBe(true);
      }
    }
  });

  it('captures real DIP-14 quirks for 7402 (reversed outputs) and 7404 (6 inverters internal, 4 exposed)', () => {
    const nor = IC_DATASHEETS.IC_7402;
    expect(nor.internalGates.map((g) => g.outputPin)).toEqual([1, 4, 10, 13]);

    const not = IC_DATASHEETS.IC_7404;
    expect(not.internalGates).toHaveLength(6);
    expect(not.internalGates.filter((g) => g.exposedOnBoard)).toHaveLength(4);
    expect(not.internalGates.filter((g) => !g.exposedOnBoard)).toHaveLength(2);
  });

  it('matches truth tables accurately across all 6 ICs', () => {
    const expectedFns: Record<ActiveGateModuleType, (a: 0 | 1, b: 0 | 1) => 0 | 1> = {
      IC_7400: (a, b) => (a === 1 && b === 1 ? 0 : 1),
      IC_7408: (a, b) => (a === 1 && b === 1 ? 1 : 0),
      IC_7432: (a, b) => (a === 1 || b === 1 ? 1 : 0),
      IC_7402: (a, b) => (a === 1 || b === 1 ? 0 : 1),
      IC_7404: (a) => (a === 1 ? 0 : 1),
      IC_7486: (a, b) => (a !== b ? 1 : 0),
    };

    for (const icType of IC_ORDER) {
      const spec = IC_DATASHEETS[icType];
      const fn = expectedFns[icType];
      for (const row of spec.truthTable.rows) {
        expect(row.output).toBe(fn(row.inputs[0], row.inputs[1] ?? 0));
      }
    }
  });

  it('summarizes live board jumper connections and signals on an inspected IC', () => {
    const ha = PRESET_CIRCUITS.find((p) => p.id === 'half-adder')!;
    const wires: WireSpec[] = ha.wires.map((w, idx) => ({ ...w, id: `HA_${idx + 1}` }));
    const sim = runSimulation({
      switches: { SW1: true, SW2: false },
      buttons: {},
      wires,
    });

    const andConns = getIcPinWireSummary('IC_7408', wires, sim.socketStates);
    expect(andConns.map((c) => c.pinNumber)).toEqual([1, 2, 3]);
    expect(andConns.find((c) => c.pinNumber === 1)?.signal).toBe('HIGH');
    expect(andConns.find((c) => c.pinNumber === 2)?.signal).toBe('LOW');
    expect(andConns.find((c) => c.pinNumber === 3)?.signal).toBe('LOW');

    const xorConns = getIcPinWireSummary('IC_7486', wires, sim.socketStates);
    expect(xorConns.map((c) => c.pinNumber)).toEqual([1, 2, 3]);
    expect(xorConns.find((c) => c.pinNumber === 3)?.signal).toBe('HIGH');
  });
});
