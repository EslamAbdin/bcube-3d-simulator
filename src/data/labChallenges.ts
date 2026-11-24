/* =========================================================================
   bCube Guided Lab Challenges — 5 Progressive Circuits for Active v1 Hardware
   ========================================================================= */

import type { LabChallengeSpec } from '../engine/circuitAnalyzer';

export const LAB_CHALLENGES: LabChallengeSpec[] = [
  {
    id: 'challenge-1-and',
    title: 'Challenge 1 — Basic AND Gate',
    difficulty: 'Beginner',
    objective: 'Wire Slide Switches SW1 (A) and SW2 (B) through 7408 AND to Red LED RED_D1 (X = A · B).',
    requiredInputs: ['SW1', 'SW2'],
    requiredOutputs: ['RED_D1'],
    suggestedICs: ['7408 AND'],
    hint: 'Connect SW1 to 7408 Pin 1, SW2 to 7408 Pin 2, and 7408 output Pin 3 to LED RED_D1.',
    expectedOutputs: ({ SW1, SW2 }) => ({
      RED_D1: SW1 === 1 && SW2 === 1 ? 1 : 0,
    }),
  },
  {
    id: 'challenge-2-not',
    title: 'Challenge 2 — Build an Inverter (NOT)',
    difficulty: 'Beginner',
    objective: 'Wire Slide Switch SW1 (A) through a 7404 Inverter gate to Red LED RED_D1 (X = !A).',
    requiredInputs: ['SW1'],
    requiredOutputs: ['RED_D1'],
    suggestedICs: ['7404 NOT'],
    hint: 'Use 7404 Gate 1: connect SW1 to Pin 1 (left input) and Pin 2 (right output) to RED_D1.',
    expectedOutputs: ({ SW1 }) => ({
      RED_D1: SW1 === 0 ? 1 : 0,
    }),
  },
  {
    id: 'challenge-3-xnor',
    title: 'Challenge 3 — Build XNOR from XOR + NOT',
    difficulty: 'Intermediate',
    objective: 'Wire SW1 (A) and SW2 (B) through 7486 XOR followed by 7404 NOT to RED_D1 (X = !(A ⊕ B)).',
    requiredInputs: ['SW1', 'SW2'],
    requiredOutputs: ['RED_D1'],
    suggestedICs: ['7486 XOR', '7404 NOT'],
    hint: 'Feed SW1 and SW2 into 7486 Pins 1 & 2, send 7486 Pin 3 into 7404 Pin 1, then route 7404 Pin 2 to RED_D1.',
    expectedOutputs: ({ SW1, SW2 }) => ({
      RED_D1: SW1 === SW2 ? 1 : 0,
    }),
  },
  {
    id: 'challenge-4-half-adder',
    title: 'Challenge 4 — Half Adder',
    difficulty: 'Intermediate',
    objective:
      'Use dual-hole branching on SW1 (X) and SW2 (Y) so RED_D1 displays Sum (X ⊕ Y) and BLUE_D1 displays Carry (X · Y).',
    requiredInputs: ['SW1', 'SW2'],
    requiredOutputs: ['RED_D1', 'BLUE_D1'],
    suggestedICs: ['7486 XOR', '7408 AND'],
    hint: 'Use Hole A of SW1 & SW2 for 7486 XOR (Pins 1, 2 -> Pin 3 -> RED_D1), and Hole B of SW1 & SW2 for 7408 AND (Pins 1, 2 -> Pin 3 -> BLUE_D1).',
    expectedOutputs: ({ SW1, SW2 }) => ({
      RED_D1: SW1 ^ SW2 ? 1 : 0,
      BLUE_D1: SW1 === 1 && SW2 === 1 ? 1 : 0,
    }),
  },
  {
    id: 'challenge-5-demorgan',
    title: "Challenge 5 — De Morgan's 1st Theorem Proof",
    difficulty: 'Advanced',
    objective:
      'Prove !(A + B) ≡ !A · !B by wiring SW1 (A) and SW2 (B) to both 7402 NOR -> RED_D1 and 7404 NOTs -> 7408 AND -> BLUE_D1.',
    requiredInputs: ['SW1', 'SW2'],
    requiredOutputs: ['RED_D1', 'BLUE_D1'],
    suggestedICs: ['7402 NOR', '7404 NOT', '7408 AND'],
    hint: 'On 7402 NOR (PCB-routed), left inputs are Pins 2 & 3 and right output is Pin 1 -> RED_D1. Branch SW1 & SW2 Hole B through 7404 Pins 1->2 and 3->4 into 7408 Pins 1 & 2 -> Pin 3 -> BLUE_D1.',
    expectedOutputs: ({ SW1, SW2 }) => {
      const bit: 0 | 1 = SW1 === 0 && SW2 === 0 ? 1 : 0;
      return {
        RED_D1: bit,
        BLUE_D1: bit,
      };
    },
  },
];
