/* =========================================================================
   bCube Textbook Lab Presets — Verified Socket IDs from boardSchema.ts
   ========================================================================= */

export interface PresetCircuitSpec {
  id: string;
  name: string;
  description: string;
  controlsHint: string;
  initialSwitches?: Record<string, boolean>;
  wires: Array<{ fromSocketId: string; toSocketId: string; color: string }>;
}

export const PRESET_CIRCUITS: PresetCircuitSpec[] = [
  {
    id: 'basic-and',
    name: 'Basic AND Gate (7408)',
    description: 'Connects Slide Switches SW1 & SW2 through 7408 Gate 1 to Red LED D1.',
    controlsHint: 'Inputs: SW1 (A), SW2 (B) • Output: RED D1 (A · B)',
    initialSwitches: { SW1: true, SW2: true },
    wires: [
      { fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7408:PIN1:A', color: '#ef4444' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7408:PIN2:A', color: '#eab308' },
      { fromSocketId: 'IC_7408:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'basic-or',
    name: 'Basic OR Gate (7432)',
    description: 'Connects Slide Switches SW1 & SW2 through 7432 Gate 1 to Red LED D1.',
    controlsHint: 'Inputs: SW1 (A), SW2 (B) • Output: RED D1 (A + B)',
    initialSwitches: { SW1: true, SW2: false },
    wires: [
      { fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7432:PIN1:A', color: '#ef4444' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7432:PIN2:A', color: '#eab308' },
      { fromSocketId: 'IC_7432:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'xnor-gate',
    name: 'XNOR Gate (7486 + 7404)',
    description: 'Cascades 7486 XOR Gate 1 into 7404 NOT Gate 1 to produce XNOR equivalence.',
    controlsHint: 'Inputs: SW1 (A), SW2 (B) • Output: RED D1 (A ⊙ B)',
    initialSwitches: { SW1: false, SW2: false },
    wires: [
      { fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7486:PIN1:A', color: '#ef4444' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7486:PIN2:A', color: '#eab308' },
      { fromSocketId: 'IC_7486:PIN3:A', toSocketId: 'IC_7404:PIN1:A', color: '#f97316' },
      { fromSocketId: 'IC_7404:PIN2:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'half-adder',
    name: 'Half Adder (7486 + 7408)',
    description:
      'Uses dual-hole branching (Hole A & Hole B) on SW1 and SW2 to drive XOR (Sum) and AND (Carry).',
    controlsHint: 'Inputs: SW1 (X), SW2 (Y) • Outputs: RED D1 (Sum), BLUE D1 (Carry)',
    initialSwitches: { SW1: true, SW2: false },
    wires: [
      { fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7486:PIN1:A', color: '#ef4444' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7486:PIN2:A', color: '#eab308' },
      { fromSocketId: 'SLIDE_SWITCH:SW1:B', toSocketId: 'IC_7408:PIN1:A', color: '#f97316' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:B', toSocketId: 'IC_7408:PIN2:A', color: '#f8fafc' },
      { fromSocketId: 'IC_7486:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
      { fromSocketId: 'IC_7408:PIN3:A', toSocketId: 'LED_BLUE:BLUE_D1:A', color: '#3b82f6' },
    ],
  },
  {
    id: 'demorgan-first',
    name: "De Morgan's 1st Theorem (7402 vs 7404+7408)",
    description:
      'Compares !(A + B) on 7402 NOR (RED D1) against !A · !B using 7404 + 7408 (BLUE D1).',
    controlsHint:
      'Inputs: SW1 (A), SW2 (B) • RED D1 = !(A+B) always matches BLUE D1 = !A · !B',
    initialSwitches: { SW1: false, SW2: false },
    wires: [
      { fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7402:PIN2:A', color: '#ef4444' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7402:PIN3:A', color: '#eab308' },
      { fromSocketId: 'IC_7402:PIN1:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
      { fromSocketId: 'SLIDE_SWITCH:SW1:B', toSocketId: 'IC_7404:PIN1:A', color: '#f97316' },
      { fromSocketId: 'SLIDE_SWITCH:SW2:B', toSocketId: 'IC_7404:PIN3:A', color: '#f8fafc' },
      { fromSocketId: 'IC_7404:PIN2:A', toSocketId: 'IC_7408:PIN1:A', color: '#ef4444' },
      { fromSocketId: 'IC_7404:PIN4:A', toSocketId: 'IC_7408:PIN2:A', color: '#eab308' },
      { fromSocketId: 'IC_7408:PIN3:A', toSocketId: 'LED_BLUE:BLUE_D1:A', color: '#3b82f6' },
    ],
  },
];
