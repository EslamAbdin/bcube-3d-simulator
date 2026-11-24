import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_MODULES,
  ALL_SOCKETS,
  BOARD_DIMENSIONS,
  BUTTON_SWITCHES,
  LED_INDICATORS,
  MODULE_MAP,
  SLIDE_SWITCHES,
  SOCKET_MAP,
  findOverlappingModules,
  type ActiveGateModuleType,
} from '../../schema/boardSchema';
import { runSimulation, type WireSpec } from '../LogicEngine';
import { useSimulatorStore } from '../../store/useSimulatorStore';

function w(id: string, fromSocketId: string, toSocketId: string, color = '#ef4444'): WireSpec {
  return { id, fromSocketId, toSocketId, color };
}

function makeBaseSwitches(overrides: Record<string, boolean> = {}): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const sw of SLIDE_SWITCHES) out[sw.id] = false;
  return { ...out, ...overrides };
}

function makeBaseButtons(overrides: Record<string, boolean> = {}): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const btn of BUTTON_SWITCHES) out[btn.id] = false;
  return { ...out, ...overrides };
}

describe('bCube Hardware Board Schema', () => {
  it('enforces exact PCB dimensions, 4x5 center slots, active/standby counts, and zero overlaps', () => {
    expect(BOARD_DIMENSIONS.width).toBe(44);
    expect(BOARD_DIMENSIONS.depth).toBe(29);
    expect(BOARD_DIMENSIONS.thickness).toBe(0.4);
    expect(BOARD_DIMENSIONS.topY).toBe(0);
    expect(BOARD_DIMENSIONS.dualHolePitch).toBeCloseTo(0.254, 4);

    const centerMods = ALL_MODULES.filter((m) => m.zone === 'center_grid');
    expect(centerMods).toHaveLength(21);
    expect(centerMods.filter((m) => m.status === 'active')).toHaveLength(6);
    expect(centerMods.filter((m) => m.status === 'standby')).toHaveLength(15);

    expect(findOverlappingModules(ALL_MODULES)).toEqual([]);

    for (const mod of ALL_MODULES) {
      expect(mod.bounds.minX).toBeGreaterThanOrEqual(-BOARD_DIMENSIONS.width / 2);
      expect(mod.bounds.maxX).toBeLessThanOrEqual(BOARD_DIMENSIONS.width / 2);
      expect(mod.bounds.minZ).toBeGreaterThanOrEqual(-BOARD_DIMENSIONS.depth / 2);
      expect(mod.bounds.maxZ).toBeLessThanOrEqual(BOARD_DIMENSIONS.depth / 2);
    }
  });

  it('generates dual-hole A/B sockets 0.254 units apart sharing identical nodeId and PCB-routed 7402 pins', () => {
    expect(SLIDE_SWITCHES).toHaveLength(16);
    expect(BUTTON_SWITCHES).toHaveLength(4);
    expect(LED_INDICATORS).toHaveLength(16);

    // Every socket pair A & B must share nodeId and sit 0.254 apart on X
    for (const sock of ALL_SOCKETS) {
      if (sock.hole === 'A') {
        const mate = SOCKET_MAP[sock.id.replace(/:A$/, ':B')];
        expect(mate).toBeDefined();
        expect(mate.nodeId).toBe(sock.nodeId);
        expect(Math.abs(mate.position.x - sock.position.x)).toBeCloseTo(0.254, 4);
      }
    }

    // 7402 NOR PCB-routed inputs on left (2,3,5,6,8,9,11,12), outputs on right (1,4,10,13)
    const nor = MODULE_MAP['IC_7402'];
    expect(nor.gates).toEqual([
      { gateIndex: 1, inputPins: [2, 3], outputPin: 1 },
      { gateIndex: 2, inputPins: [5, 6], outputPin: 4 },
      { gateIndex: 3, inputPins: [8, 9], outputPin: 10 },
      { gateIndex: 4, inputPins: [11, 12], outputPin: 13 },
    ]);
    // 7404 NOT has 4 accessible gates
    expect(MODULE_MAP['IC_7404'].gates).toHaveLength(4);
  });
});

describe('bCube LogicEngine Simulation', () => {
  it('verifies complete truth tables for all 6 active gate ICs (7404, 7408, 7432, 7400, 7402, 7486)', () => {
    // 1. IC_7404 (NOT) across all 4 accessible gates
    for (const g of MODULE_MAP['IC_7404'].gates!) {
      for (const bit of [false, true]) {
        const res = runSimulation({
          switches: makeBaseSwitches({ SW1: bit }),
          buttons: makeBaseButtons(),
          wires: [
            w('w1', 'SLIDE_SWITCH:SW1:A', `IC_7404:PIN${g.inputPins[0]}:A`),
            w('w2', `IC_7404:PIN${g.outputPin}:A`, 'LED_RED:RED_D1:A'),
          ],
        });
        expect(res.converged).toBe(true);
        expect(res.ledStates['RED_D1'].signal).toBe(bit ? 'LOW' : 'HIGH');
        expect(res.ledStates['RED_D1'].lit).toBe(!bit);
      }
    }

    // 2. Binary 2-input gates across all 5 modules & their 4 gates
    const cases: Array<{ modId: ActiveGateModuleType; fn: (a: boolean, b: boolean) => boolean }> = [
      { modId: 'IC_7408', fn: (a, b) => a && b },
      { modId: 'IC_7432', fn: (a, b) => a || b },
      { modId: 'IC_7400', fn: (a, b) => !(a && b) },
      { modId: 'IC_7402', fn: (a, b) => !(a || b) },
      { modId: 'IC_7486', fn: (a, b) => a !== b },
    ];

    for (const { modId, fn } of cases) {
      const gates = MODULE_MAP[modId].gates!;
      expect(gates).toHaveLength(4);
      for (const g of gates) {
        for (const a of [false, true]) {
          for (const b of [false, true]) {
            const res = runSimulation({
              switches: makeBaseSwitches({ SW1: a, SW2: b }),
              buttons: makeBaseButtons(),
              wires: [
                w('wa', 'SLIDE_SWITCH:SW1:A', `${modId}:PIN${g.inputPins[0]}:A`),
                w('wb', 'SLIDE_SWITCH:SW2:A', `${modId}:PIN${g.inputPins[1]}:A`),
                w('wo', `${modId}:PIN${g.outputPin}:A`, 'LED_BLUE:BLUE_D1:A'),
              ],
            });
            const expected = fn(a, b);
            expect(res.converged).toBe(true);
            expect(res.ledStates['BLUE_D1'].signal).toBe(expected ? 'HIGH' : 'LOW');
            expect(res.ledStates['BLUE_D1'].lit).toBe(expected);
          }
        }
      }
    }
  });

  it('supports dual-hole wire branching (Hole A and Hole B share the exact same electrical net)', () => {
    const wires = [
      // Branch SW1 via Hole A to 7408 and Hole B to 7486
      w('w1', 'SLIDE_SWITCH:SW1:A', 'IC_7408:PIN1:A'),
      w('w2', 'SLIDE_SWITCH:SW1:B', 'IC_7486:PIN1:A'),
      w('w3', 'SLIDE_SWITCH:SW2:A', 'IC_7408:PIN2:A'),
      w('w4', 'SLIDE_SWITCH:SW2:B', 'IC_7486:PIN2:A'),
      w('w5', 'IC_7408:PIN3:A', 'LED_RED:RED_D1:A'),
      w('w6', 'IC_7486:PIN3:A', 'LED_BLUE:BLUE_D1:A'),
    ];

    // SW1=ON, SW2=ON -> AND=1 (RED_D1 lit), XOR=0 (BLUE_D1 off)
    const r11 = runSimulation({
      switches: makeBaseSwitches({ SW1: true, SW2: true }),
      buttons: makeBaseButtons(),
      wires,
    });
    expect(r11.socketStates['IC_7408:PIN1:B']).toBe('HIGH');
    expect(r11.socketStates['IC_7486:PIN1:B']).toBe('HIGH');
    expect(r11.ledStates['RED_D1'].lit).toBe(true);
    expect(r11.ledStates['BLUE_D1'].lit).toBe(false);

    // SW1=ON, SW2=OFF -> AND=0, XOR=1
    const r10 = runSimulation({
      switches: makeBaseSwitches({ SW1: true, SW2: false }),
      buttons: makeBaseButtons(),
      wires,
    });
    expect(r10.ledStates['RED_D1'].lit).toBe(false);
    expect(r10.ledStates['BLUE_D1'].lit).toBe(true);
  });

  it('enforces Active-Low polarity on Button Switches (released=HIGH, pressed=LOW)', () => {
    const wires = [w('w1', 'BUTTON_SWITCH:BTN1:A', 'LED_RED:RED_D1:A')];

    const released = runSimulation({
      switches: makeBaseSwitches(),
      buttons: makeBaseButtons({ BTN1: false }),
      wires,
    });
    expect(released.socketStates['BUTTON_SWITCH:BTN1:B']).toBe('HIGH');
    expect(released.ledStates['RED_D1'].lit).toBe(true);

    const pressed = runSimulation({
      switches: makeBaseSwitches(),
      buttons: makeBaseButtons({ BTN1: true }),
      wires,
    });
    expect(pressed.socketStates['BUTTON_SWITCH:BTN1:B']).toBe('LOW');
    expect(pressed.ledStates['RED_D1'].lit).toBe(false);
  });

  it('simulates multi-stage combinational Half Adder (XOR Sum + AND Carry) cleanly', () => {
    const wires = [
      w('1', 'SLIDE_SWITCH:SW1:A', 'IC_7486:PIN1:A'),
      w('2', 'SLIDE_SWITCH:SW2:A', 'IC_7486:PIN2:A'),
      w('3', 'SLIDE_SWITCH:SW1:B', 'IC_7408:PIN1:A'),
      w('4', 'SLIDE_SWITCH:SW2:B', 'IC_7408:PIN2:A'),
      w('5', 'IC_7486:PIN3:A', 'LED_RED:RED_D1:A'), // Sum
      w('6', 'IC_7408:PIN3:A', 'LED_RED:RED_D2:A'), // Carry
    ];

    for (const [a, b, expSum, expCarry] of [
      [false, false, false, false],
      [false, true, true, false],
      [true, false, true, false],
      [true, true, false, true],
    ] as const) {
      const res = runSimulation({
        switches: makeBaseSwitches({ SW1: a, SW2: b }),
        buttons: makeBaseButtons(),
        wires,
      });
      expect(res.converged).toBe(true);
      expect(res.ledStates['RED_D1'].lit).toBe(expSum);
      expect(res.ledStates['RED_D2'].lit).toBe(expCarry);
    }
  });

  it("proves De Morgan's Law: 7402 NOR(A,B) equals 7408 AND(7404 NOT(A), 7404 NOT(B)) across all 4 input states", () => {
    const wires = [
      // LHS: 7402 NOR Gate 1 (Pins 2,3 -> Pin 1 -> RED_D1)
      w('1', 'SLIDE_SWITCH:SW1:A', 'IC_7402:PIN2:A'),
      w('2', 'SLIDE_SWITCH:SW2:A', 'IC_7402:PIN3:A'),
      w('3', 'IC_7402:PIN1:A', 'LED_RED:RED_D1:A'),
      // RHS: 7404 (Pins 1->2, 3->4) -> 7408 AND (Pins 1,2 -> Pin 3 -> BLUE_D1)
      w('4', 'SLIDE_SWITCH:SW1:B', 'IC_7404:PIN1:A'),
      w('5', 'SLIDE_SWITCH:SW2:B', 'IC_7404:PIN3:A'),
      w('6', 'IC_7404:PIN2:A', 'IC_7408:PIN1:A'),
      w('7', 'IC_7404:PIN4:A', 'IC_7408:PIN2:A'),
      w('8', 'IC_7408:PIN3:A', 'LED_BLUE:BLUE_D1:A'),
    ];

    for (const a of [false, true]) {
      for (const b of [false, true]) {
        const res = runSimulation({
          switches: makeBaseSwitches({ SW1: a, SW2: b }),
          buttons: makeBaseButtons(),
          wires,
        });
        expect(res.converged).toBe(true);
        const expected = !(a || b);
        expect(res.ledStates['RED_D1'].lit).toBe(expected);
        expect(res.ledStates['BLUE_D1'].lit).toBe(expected);
      }
    }
  });

  it('builds XNOR cleanly by cascading 7486 XOR into 7404 NOT', () => {
    const wires = [
      w('1', 'SLIDE_SWITCH:SW1:A', 'IC_7486:PIN1:A'),
      w('2', 'SLIDE_SWITCH:SW2:A', 'IC_7486:PIN2:A'),
      w('3', 'IC_7486:PIN3:A', 'IC_7404:PIN1:A'),
      w('4', 'IC_7404:PIN2:A', 'LED_BLUE:BLUE_D1:A'),
    ];

    for (const a of [false, true]) {
      for (const b of [false, true]) {
        const res = runSimulation({
          switches: makeBaseSwitches({ SW1: a, SW2: b }),
          buttons: makeBaseButtons(),
          wires,
        });
        expect(res.ledStates['BLUE_D1'].lit).toBe(a === b);
      }
    }
  });

  it('detects bus contention (CONFLICT) when opposing active drivers are shorted', () => {
    // Short SW1 (HIGH) with SW2 (LOW) on LED_RED_D1
    const res1 = runSimulation({
      switches: makeBaseSwitches({ SW1: true, SW2: false }),
      buttons: makeBaseButtons(),
      wires: [
        w('1', 'SLIDE_SWITCH:SW1:A', 'LED_RED:RED_D1:A'),
        w('2', 'SLIDE_SWITCH:SW2:A', 'LED_RED:RED_D1:B'),
      ],
    });
    expect(res1.conflicts.length).toBeGreaterThan(0);
    expect(res1.ledStates['RED_D1'].signal).toBe('CONFLICT');
    expect(res1.ledStates['RED_D1'].error).toBe(true);
    expect(res1.ledStates['RED_D1'].lit).toBe(false);

    // Short two gate outputs driving opposite signals: 7404(SW1=ON->LOW) shorted to 7404(SW2=OFF->HIGH)
    const res2 = runSimulation({
      switches: makeBaseSwitches({ SW1: true, SW2: false }),
      buttons: makeBaseButtons(),
      wires: [
        w('1', 'SLIDE_SWITCH:SW1:A', 'IC_7404:PIN1:A'),
        w('2', 'SLIDE_SWITCH:SW2:A', 'IC_7404:PIN3:A'),
        w('3', 'IC_7404:PIN2:A', 'IC_7404:PIN4:A'),
        w('4', 'IC_7404:PIN2:B', 'LED_BLUE:BLUE_D1:A'),
      ],
    });
    expect(res2.conflicts.length).toBe(1);
    expect(res2.ledStates['BLUE_D1'].signal).toBe('CONFLICT');
    expect(res2.ledStates['BLUE_D1'].error).toBe(true);
  });

  it('handles ttlFloatingIsHigh false (beginner FLOATING) vs true (TTL floats HIGH)', () => {
    const wires = [
      w('1', 'SLIDE_SWITCH:SW1:A', 'IC_7408:PIN1:A'),
      // IC_7408:PIN2 deliberately left unconnected!
      w('2', 'IC_7408:PIN3:A', 'LED_RED:RED_D1:A'),
      // IC_7404:PIN1 deliberately left unconnected!
      w('3', 'IC_7404:PIN2:A', 'LED_BLUE:BLUE_D1:A'),
    ];

    const beginnerMode = runSimulation({
      switches: makeBaseSwitches({ SW1: true }),
      buttons: makeBaseButtons(),
      wires,
      ttlFloatingIsHigh: false,
    });
    expect(beginnerMode.ledStates['RED_D1'].signal).toBe('FLOATING');
    expect(beginnerMode.ledStates['RED_D1'].lit).toBe(false);
    expect(beginnerMode.ledStates['BLUE_D1'].signal).toBe('FLOATING');

    const ttlMode = runSimulation({
      switches: makeBaseSwitches({ SW1: true }),
      buttons: makeBaseButtons(),
      wires,
      ttlFloatingIsHigh: true,
    });
    // AND(HIGH, FLOATING->HIGH) = HIGH; NOT(FLOATING->HIGH) = LOW
    expect(ttlMode.ledStates['RED_D1'].signal).toBe('HIGH');
    expect(ttlMode.ledStates['RED_D1'].lit).toBe(true);
    expect(ttlMode.ledStates['BLUE_D1'].signal).toBe('LOW');
  });
});

describe('useSimulatorStore', () => {
  beforeEach(() => {
    useSimulatorStore.getState().resetBoard();
  });

  it('prevents self-loops and duplicate wires, supports button latch and JSON roundtrip', () => {
    const store = useSimulatorStore.getState();

    // Reject self-loop
    expect(store.addWire('SLIDE_SWITCH:SW1:A', 'SLIDE_SWITCH:SW1:A')).toBe(false);
    // Reject unknown socket
    expect(store.addWire('FAKE:SOCKET', 'LED_RED:RED_D1:A')).toBe(false);

    // Valid wire & duplicate prevention (both directions)
    expect(store.addWire('SLIDE_SWITCH:SW1:A', 'LED_RED:RED_D1:A')).toBe(true);
    expect(store.addWire('SLIDE_SWITCH:SW1:A', 'LED_RED:RED_D1:A')).toBe(false);
    expect(store.addWire('LED_RED:RED_D1:A', 'SLIDE_SWITCH:SW1:A')).toBe(false);
    expect(useSimulatorStore.getState().wires).toHaveLength(1);

    // Slide switch ON -> LED lit
    useSimulatorStore.getState().toggleSlideSwitch('SW1');
    expect(useSimulatorStore.getState().ledStates['RED_D1'].lit).toBe(true);

    // Export JSON, reset board, and re-import identically
    const exported = useSimulatorStore.getState().exportCircuitJSON();
    useSimulatorStore.getState().resetBoard();
    expect(useSimulatorStore.getState().wires).toHaveLength(0);
    expect(useSimulatorStore.getState().ledStates['RED_D1'].lit).toBe(false);

    const imp = useSimulatorStore.getState().importCircuitJSON(exported);
    expect(imp.ok).toBe(true);
    expect(useSimulatorStore.getState().wires).toHaveLength(1);
    expect(useSimulatorStore.getState().ledStates['RED_D1'].lit).toBe(true);

    // Button latch keeps button pressed (LOW) even on pointer-up (setButtonPressed false)
    useSimulatorStore.getState().toggleButtonLatch('BTN1');
    useSimulatorStore.getState().setButtonPressed('BTN1', false);
    expect(useSimulatorStore.getState().buttons['BTN1']).toBe(true);
  });
});
