import { describe, expect, it } from 'vitest';
import { PRESET_CIRCUITS } from '../../data/presetCircuits';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { runSimulation, type WireSpec } from '../LogicEngine';
import { analyzeWiringErrors } from '../wiringDiagnostics';

function makeWire(id: string, fromSocketId: string, toSocketId: string): WireSpec {
  return { id, fromSocketId, toSocketId, color: '#ef4444' };
}

function runErc(
  wires: WireSpec[],
  switches: Record<string, boolean> = {},
  ttlFloatingIsHigh = false
) {
  const sim = runSimulation({
    switches,
    buttons: {},
    wires,
    ttlFloatingIsHigh,
  });
  return analyzeWiringErrors(wires, sim, { ttlFloatingIsHigh });
}

describe('wiringDiagnostics (ERC)', () => {
  it('flags OUTPUT_TO_OUTPUT even when both gate outputs are currently LOW', () => {
    // 7408 G1 Pin 3 = LOW, 7408 G2 Pin 6 = LOW (both wired inputs LOW)
    const wires: WireSpec[] = [
      makeWire('w1', 'SLIDE_SWITCH:SW1:A', 'IC_7408:PIN1:A'),
      makeWire('w2', 'SLIDE_SWITCH:SW2:A', 'IC_7408:PIN2:A'),
      makeWire('w3', 'SLIDE_SWITCH:SW3:A', 'IC_7408:PIN4:A'),
      makeWire('w4', 'SLIDE_SWITCH:SW4:A', 'IC_7408:PIN5:A'),
      makeWire('w5', 'IC_7408:PIN3:A', 'IC_7408:PIN6:A'),
    ];
    const diags = runErc(wires, { SW1: false, SW2: false, SW3: false, SW4: false });
    const rule = diags.find((d) => d.code === 'OUTPUT_TO_OUTPUT');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('error');
    expect(rule?.affectedWireIds).toContain('w5');
  });

  it('flags MULTIPLE_SWITCHES_ON_NET even when both switches are OFF', () => {
    const wires: WireSpec[] = [
      makeWire('w1', 'SLIDE_SWITCH:SW1:A', 'IC_7408:PIN1:A'),
      makeWire('w2', 'SLIDE_SWITCH:SW2:A', 'IC_7408:PIN1:B'),
    ];
    const diags = runErc(wires, { SW1: false, SW2: false });
    const rule = diags.find((d) => d.code === 'MULTIPLE_SWITCHES_ON_NET');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('error');
    expect(rule?.message).toContain('SW1');
    expect(rule?.message).toContain('SW2');
    expect(rule?.affectedWireIds).toEqual(expect.arrayContaining(['w1', 'w2']));
  });

  it('flags SWITCH_TO_OUTPUT when a switch or button is wired onto a gate output net', () => {
    const wires: WireSpec[] = [
      makeWire('w1', 'SLIDE_SWITCH:SW1:A', 'IC_7408:PIN1:A'),
      makeWire('w2', 'SLIDE_SWITCH:SW2:A', 'IC_7408:PIN2:A'),
      makeWire('w3', 'SLIDE_SWITCH:SW3:A', 'IC_7408:PIN3:A'),
    ];
    const diags = runErc(wires, { SW1: false, SW2: false, SW3: false });
    const rule = diags.find((d) => d.code === 'SWITCH_TO_OUTPUT');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('error');
    expect(rule?.affectedWireIds).toContain('w3');
  });

  it('flags COMBINATIONAL_FEEDBACK_LOOP for direct and multi-gate cycles', () => {
    // Direct self-loop on 7404 Gate 1 (Pin 2 -> Pin 1)
    const directLoop = runErc([makeWire('w_loop', 'IC_7404:PIN2:A', 'IC_7404:PIN1:A')]);
    const directRule = directLoop.find((d) => d.code === 'COMBINATIONAL_FEEDBACK_LOOP');
    expect(directRule).toBeDefined();
    expect(directRule?.severity).toBe('warning');
    expect(directRule?.affectedWireIds).toContain('w_loop');

    // Two-gate cycle: 7404 G1 -> G2 -> G1
    const ringLoop = runErc([
      makeWire('w_a', 'IC_7404:PIN2:A', 'IC_7404:PIN3:A'),
      makeWire('w_b', 'IC_7404:PIN4:A', 'IC_7404:PIN1:A'),
    ]);
    const ringRule = ringLoop.find((d) => d.code === 'COMBINATIONAL_FEEDBACK_LOOP');
    expect(ringRule).toBeDefined();
    expect(ringRule?.affectedWireIds).toEqual(expect.arrayContaining(['w_a', 'w_b']));
  });

  it('flags UNCONNECTED_GATE_INPUT when a 2-input gate has only one input wired', () => {
    const wires: WireSpec[] = [
      makeWire('w1', 'SLIDE_SWITCH:SW1:A', 'IC_7408:PIN1:A'),
      makeWire('w2', 'IC_7408:PIN3:A', 'LED_RED:RED_D1:A'),
    ];
    const diags = runErc(wires, { SW1: true });
    const rule = diags.find((d) => d.code === 'UNCONNECTED_GATE_INPUT');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('warning');
    expect(rule?.message).toContain('Pin 2');
    expect(rule?.affectedWireIds).toEqual(expect.arrayContaining(['w1', 'w2']));
  });

  it('flags UNDRIVEN_LED when an LED is wired without a switch, button, or gate output', () => {
    const wires: WireSpec[] = [makeWire('w1', 'LED_RED:RED_D1:A', 'LED_BLUE:BLUE_D1:A')];
    const diags = runErc(wires);
    const rule = diags.find((d) => d.code === 'UNDRIVEN_LED');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('warning');
    expect(rule?.affectedWireIds).toContain('w1');
  });

  it('reports zero errors and zero warnings for all 5 official lab presets', () => {
    expect(PRESET_CIRCUITS).toHaveLength(5);
    for (const preset of PRESET_CIRCUITS) {
      const wires = preset.wires.map((w, idx) => ({
        id: `${preset.id}_${idx}`,
        ...w,
      }));
      const diags = runErc(wires, preset.initialSwitches ?? {});
      expect(diags, `Preset "${preset.name}" should have 0 ERC diagnostics`).toEqual([]);
    }
  });

  it('safeguard rejects connecting two holes of the same pin (identical nodeId)', () => {
    const store = useSimulatorStore.getState();
    store.resetBoard();
    expect(store.addWire('SLIDE_SWITCH:SW1:A', 'SLIDE_SWITCH:SW1:B')).toBe(false);

    store.startWiring('IC_7408:PIN1:A');
    const res = store.completeWiring('IC_7408:PIN1:B');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('self');
    expect(useSimulatorStore.getState().wires).toHaveLength(0);
    expect(useSimulatorStore.getState().pendingSocketId).toBeNull();
  });

  it('requires explicit ignore confirmation before connecting illogical wires when ERC is ON', () => {
    const store = useSimulatorStore.getState();
    store.resetBoard();
    if (!store.errorWarningsEnabled) store.toggleErrorWarnings();

    // Normal 1st wire to a 2-input gate connects immediately without nagging
    store.startWiring('SLIDE_SWITCH:SW1:A');
    const first = store.completeWiring('IC_7408:PIN1:A');
    expect(first.ok).toBe(true);
    expect(useSimulatorStore.getState().pendingWireWarning).toBeNull();
    expect(useSimulatorStore.getState().wires).toHaveLength(1);

    // Connecting a 2nd switch onto the same input net triggers pre-connection warning
    store.startWiring('SLIDE_SWITCH:SW2:A');
    const blocked = store.completeWiring('IC_7408:PIN1:B');
    expect(blocked).toEqual({ ok: false, reason: 'warning' });
    expect(useSimulatorStore.getState().wires).toHaveLength(1);
    expect(useSimulatorStore.getState().pendingWireWarning?.diagnostics[0].code).toBe(
      'MULTIPLE_SWITCHES_ON_NET'
    );

    // Cancel keeps wire disconnected
    store.dismissPendingWireWarning();
    expect(useSimulatorStore.getState().pendingWireWarning).toBeNull();
    expect(useSimulatorStore.getState().wires).toHaveLength(1);

    // Re-attempt then press Ignore & Connect -> wire connects
    store.startWiring('SLIDE_SWITCH:SW2:A');
    store.completeWiring('IC_7408:PIN1:B');
    const confirmed = store.confirmPendingWireWarning();
    expect(confirmed).toBe(true);
    expect(useSimulatorStore.getState().pendingWireWarning).toBeNull();
    expect(useSimulatorStore.getState().wires).toHaveLength(2);

    // Also verifies combinational feedback loop triggers warning before connecting
    store.startWiring('IC_7404:PIN2:A');
    const loopRes = store.completeWiring('IC_7404:PIN1:A');
    expect(loopRes).toEqual({ ok: false, reason: 'warning' });
    expect(useSimulatorStore.getState().pendingWireWarning?.diagnostics[0].code).toBe(
      'COMBINATIONAL_FEEDBACK_LOOP'
    );
    store.dismissPendingWireWarning();

    // Connecting two gate outputs directly (OUTPUT_TO_OUTPUT) triggers warning first
    store.startWiring('IC_7408:PIN3:A');
    const outRes = store.completeWiring('IC_7432:PIN3:A');
    expect(outRes).toEqual({ ok: false, reason: 'warning' });
    expect(useSimulatorStore.getState().pendingWireWarning?.diagnostics[0].code).toBe(
      'OUTPUT_TO_OUTPUT'
    );
    store.dismissPendingWireWarning();

    // Turning ERC OFF skips the warning gate
    store.toggleErrorWarnings();
    store.startWiring('IC_7404:PIN2:A');
    const directRes = store.completeWiring('IC_7404:PIN1:A');
    expect(directRes.ok).toBe(true);
    expect(useSimulatorStore.getState().wires).toHaveLength(3);

    // Restore ERC ON default
    store.toggleErrorWarnings();
    store.resetBoard();
  });
});
