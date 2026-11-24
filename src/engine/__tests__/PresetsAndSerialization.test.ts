import { beforeEach, describe, expect, it } from 'vitest';
import { PRESET_CIRCUITS } from '../../data/presetCircuits';
import { SOCKET_MAP } from '../../schema/boardSchema';
import { useSimulatorStore } from '../../store/useSimulatorStore';

function setInputsAndRead(sw1: boolean, sw2: boolean) {
  const s = useSimulatorStore.getState();
  if (s.switches.SW1 !== sw1) s.toggleSlideSwitch('SW1');
  if (useSimulatorStore.getState().switches.SW2 !== sw2) {
    useSimulatorStore.getState().toggleSlideSwitch('SW2');
  }
  return useSimulatorStore.getState();
}

describe('Milestone 4: Textbook Lab Presets, Wiring Guards & Circuit Serialization', () => {
  beforeEach(() => {
    useSimulatorStore.getState().resetBoard();
    useSimulatorStore.getState().setTtlFloatingIsHigh(false);
  });

  it('every socket ID in every preset exists in SOCKET_MAP with no self-loops or duplicates', () => {
    expect(PRESET_CIRCUITS.length).toBe(5);
    for (const preset of PRESET_CIRCUITS) {
      const seenPairs = new Set<string>();
      for (const w of preset.wires) {
        expect(SOCKET_MAP[w.fromSocketId]).toBeDefined();
        expect(SOCKET_MAP[w.toSocketId]).toBeDefined();
        expect(w.fromSocketId).not.toBe(w.toSocketId);
        const key = [w.fromSocketId, w.toSocketId].sort().join('<->');
        expect(seenPairs.has(key)).toBe(false);
        seenPairs.add(key);
      }
    }
  });

  it('Half Adder preset produces exact Sum (RED_D1) and Carry (BLUE_D1) across all 4 input states', () => {
    expect(useSimulatorStore.getState().loadPreset('half-adder')).toBe(true);

    const cases: Array<[boolean, boolean, boolean, boolean]> = [
      [false, false, false, false],
      [false, true, true, false],
      [true, false, true, false],
      [true, true, false, true],
    ];

    for (const [x, y, expectedSum, expectedCarry] of cases) {
      const st = setInputsAndRead(x, y);
      expect(st.conflicts).toHaveLength(0);
      expect(st.ledStates.RED_D1.lit).toBe(expectedSum);
      expect(st.ledStates.BLUE_D1.lit).toBe(expectedCarry);
    }
  });

  it("De Morgan's 1st Theorem keeps RED_D1 === BLUE_D1 across all 4 (SW1, SW2) combinations", () => {
    expect(useSimulatorStore.getState().loadPreset('demorgan-first')).toBe(true);

    const cases: Array<[boolean, boolean, boolean]> = [
      [false, false, true],
      [false, true, false],
      [true, false, false],
      [true, true, false],
    ];

    for (const [a, b, expected] of cases) {
      const st = setInputsAndRead(a, b);
      expect(st.conflicts).toHaveLength(0);
      expect(st.ledStates.RED_D1.lit).toBe(expected);
      expect(st.ledStates.BLUE_D1.lit).toBe(expected);
      expect(st.ledStates.RED_D1.lit).toBe(st.ledStates.BLUE_D1.lit);
    }
  });

  it('Basic AND, Basic OR, and XNOR presets produce exact truth tables on RED_D1', () => {
    useSimulatorStore.getState().loadPreset('basic-and');
    expect(setInputsAndRead(true, false).ledStates.RED_D1.lit).toBe(false);
    expect(setInputsAndRead(true, true).ledStates.RED_D1.lit).toBe(true);

    useSimulatorStore.getState().loadPreset('basic-or');
    expect(setInputsAndRead(false, false).ledStates.RED_D1.lit).toBe(false);
    expect(setInputsAndRead(false, true).ledStates.RED_D1.lit).toBe(true);

    useSimulatorStore.getState().loadPreset('xnor-gate');
    expect(setInputsAndRead(false, false).ledStates.RED_D1.lit).toBe(true);
    expect(setInputsAndRead(true, false).ledStates.RED_D1.lit).toBe(false);
    expect(setInputsAndRead(true, true).ledStates.RED_D1.lit).toBe(true);
  });

  it('round-trips JSON export/import and URL hash encode/decode losslessly', () => {
    useSimulatorStore.getState().loadPreset('half-adder');
    useSimulatorStore.getState().toggleButtonLatch('BTN2');
    const before = setInputsAndRead(true, true);
    const json = before.exportCircuitJSON();
    const hash = before.encodeCircuitToHash();
    expect(hash.startsWith('#circuit=')).toBe(true);

    // Clear and restore via JSON
    useSimulatorStore.getState().resetBoard();
    expect(useSimulatorStore.getState().wires).toHaveLength(0);
    expect(useSimulatorStore.getState().importCircuitJSON(json)).toEqual({ ok: true });
    let restored = useSimulatorStore.getState();
    expect(restored.wires).toHaveLength(6);
    expect(restored.switches.SW1).toBe(true);
    expect(restored.switches.SW2).toBe(true);
    expect(restored.buttons.BTN2).toBe(true);
    expect(restored.ledStates.RED_D1.lit).toBe(false);
    expect(restored.ledStates.BLUE_D1.lit).toBe(true);

    // Clear and restore via URL hash
    useSimulatorStore.getState().resetBoard();
    expect(useSimulatorStore.getState().loadCircuitFromHash(hash)).toEqual({ ok: true });
    restored = useSimulatorStore.getState();
    expect(restored.wires).toHaveLength(6);
    expect(restored.switches.SW1).toBe(true);
    expect(restored.switches.SW2).toBe(true);
    expect(restored.buttons.BTN2).toBe(true);
    expect(restored.ledStates.BLUE_D1.lit).toBe(true);

    // Malformed payloads fail cleanly without throwing
    expect(useSimulatorStore.getState().importCircuitJSON('{bad json').ok).toBe(false);
    expect(useSimulatorStore.getState().loadCircuitFromHash('#circuit=%%%invalid').ok).toBe(false);
  });

  it('guards against self-loops, duplicate wires, and supports undoLastWire', () => {
    const store = useSimulatorStore.getState();
    store.startWiring('SLIDE_SWITCH:SW1:A');
    expect(useSimulatorStore.getState().pendingSocketId).toBe('SLIDE_SWITCH:SW1:A');

    // Self-loop rejected with warning toast
    const selfRes = useSimulatorStore.getState().completeWiring('SLIDE_SWITCH:SW1:A');
    expect(selfRes).toEqual({ ok: false, reason: 'self' });
    expect(useSimulatorStore.getState().wires).toHaveLength(0);
    expect(useSimulatorStore.getState().statusToast?.kind).toBe('warning');

    // Valid wire created
    useSimulatorStore.getState().startWiring('SLIDE_SWITCH:SW1:A');
    const okRes = useSimulatorStore.getState().completeWiring('LED_RED:RED_D1:A');
    expect(okRes).toEqual({ ok: true });
    expect(useSimulatorStore.getState().wires).toHaveLength(1);

    // Duplicate pair (even reversed) rejected
    useSimulatorStore.getState().startWiring('LED_RED:RED_D1:A');
    const dupRes = useSimulatorStore.getState().completeWiring('SLIDE_SWITCH:SW1:A');
    expect(dupRes).toEqual({ ok: false, reason: 'duplicate' });
    expect(useSimulatorStore.getState().wires).toHaveLength(1);

    // Undo removes last wire
    expect(useSimulatorStore.getState().undoLastWire()).toBe(true);
    expect(useSimulatorStore.getState().wires).toHaveLength(0);
    expect(useSimulatorStore.getState().undoLastWire()).toBe(false);
  });
});
