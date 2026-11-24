/* =========================================================================
   bCube Active DIP-14 IC Datasheets, Internal Gate Schematics & Wiring Queries
   Zero React or Three.js imports.
   ========================================================================= */

import type { WireSpec } from '../engine/LogicEngine';
import type { SignalLevel } from '../engine/gateEvaluators';
import {
  ALL_MODULES,
  SOCKET_MAP,
  type ActiveGateModuleType,
} from '../schema/boardSchema';
import type { TeachingLanguage } from '../store/useSimulatorStore';

export interface IcInternalGateSpec {
  gateIndex: number;
  inputPins: number[];
  outputPin: number;
  exposedOnBoard: boolean;
}

export interface IcTruthRow {
  inputs: Array<0 | 1>;
  output: 0 | 1;
}

export interface IcEquationTerm {
  text: string;
  overline?: boolean;
}

export interface IcDatasheetSpec {
  type: ActiveGateModuleType;
  partNumber: string;
  chipShort: string;
  gateName: 'NAND' | 'AND' | 'OR' | 'NOR' | 'NOT' | 'XOR';
  title: Record<TeachingLanguage, string>;
  summary: Record<TeachingLanguage, string>;
  wiringNote: Record<TeachingLanguage, string>;
  equationPlain: string;
  equationParts: IcEquationTerm[];
  vccPin: 14;
  gndPin: 7;
  layoutKind: 'standard-quad' | 'nor-quad' | 'hex-not';
  internalGates: IcInternalGateSpec[];
  truthTable: {
    inputLabels: string[];
    rows: IcTruthRow[];
  };
  specs: {
    family: string;
    package: string;
    supply: string;
    propagationDelay: string;
    totalGatesInside: number;
    exposedOnBoard: number;
  };
  demoLessonId: string;
}

const STANDARD_QUAD_GATES: IcInternalGateSpec[] = [
  { gateIndex: 1, inputPins: [1, 2], outputPin: 3, exposedOnBoard: true },
  { gateIndex: 2, inputPins: [4, 5], outputPin: 6, exposedOnBoard: true },
  { gateIndex: 3, inputPins: [9, 10], outputPin: 8, exposedOnBoard: true },
  { gateIndex: 4, inputPins: [12, 13], outputPin: 11, exposedOnBoard: true },
];

const NOR_QUAD_GATES: IcInternalGateSpec[] = [
  { gateIndex: 1, inputPins: [2, 3], outputPin: 1, exposedOnBoard: true },
  { gateIndex: 2, inputPins: [5, 6], outputPin: 4, exposedOnBoard: true },
  { gateIndex: 3, inputPins: [8, 9], outputPin: 10, exposedOnBoard: true },
  { gateIndex: 4, inputPins: [11, 12], outputPin: 13, exposedOnBoard: true },
];

const HEX_NOT_GATES: IcInternalGateSpec[] = [
  { gateIndex: 1, inputPins: [1], outputPin: 2, exposedOnBoard: true },
  { gateIndex: 2, inputPins: [3], outputPin: 4, exposedOnBoard: true },
  { gateIndex: 3, inputPins: [5], outputPin: 6, exposedOnBoard: true },
  { gateIndex: 4, inputPins: [9], outputPin: 8, exposedOnBoard: true },
  { gateIndex: 5, inputPins: [11], outputPin: 10, exposedOnBoard: false },
  { gateIndex: 6, inputPins: [13], outputPin: 12, exposedOnBoard: false },
];

export const IC_ORDER: ActiveGateModuleType[] = [
  'IC_7400',
  'IC_7408',
  'IC_7432',
  'IC_7402',
  'IC_7404',
  'IC_7486',
];

export const IC_DATASHEETS: Record<ActiveGateModuleType, IcDatasheetSpec> = {
  IC_7400: {
    type: 'IC_7400',
    partNumber: 'SN74LS00N',
    chipShort: '7400',
    gateName: 'NAND',
    title: {
      en: '7400 Quad 2-Input NAND Gate',
      ar: 'آي سي 7400 — 4 بوابات NAND ثنائية المداخل',
    },
    summary: {
      en: 'Contains 4 independent 2-input NAND gates. Output is LOW (0) only when BOTH inputs are HIGH (1); otherwise output stays HIGH (1). Also a "universal gate" capable of building any other logic function.',
      ar: 'يحتوي على 4 بوابات NAND مستقلة. يكون المخرج 0 (تُقطع الكهرباء) فقط عندما يكون المدخلان = 1 معاً، وفي أي حالة أخرى يظل المخرج = 1. وتُعرف بأنها بوابة شاملة لبناء أي دائرة منطقية.',
    },
    wiringNote: {
      en: 'Pins 1,2, 4,5, 9,10, 12,13 route to the LEFT white header; outputs 3, 6, 8, 11 route to the RIGHT header. VCC (+5V) on Pin 14 and GND on Pin 7 are internally powered by the bCube board.',
      ar: 'أطراف المداخل (1,2 و 4,5 و 9,10 و 12,13) موصلة على البوردة يساراً، والمخارج (3 و 6 و 8 و 11) يميناً. تغذية +5V (طرف 14) و GND (طرف 7) موصلة تلقائياً داخل البوردة.',
    },
    equationPlain: 'Y = (A · B)′',
    equationParts: [
      { text: 'Y = ' },
      { text: 'A · B', overline: true },
    ],
    vccPin: 14,
    gndPin: 7,
    layoutKind: 'standard-quad',
    internalGates: STANDARD_QUAD_GATES,
    truthTable: {
      inputLabels: ['A', 'B'],
      rows: [
        { inputs: [0, 0], output: 1 },
        { inputs: [0, 1], output: 1 },
        { inputs: [1, 0], output: 1 },
        { inputs: [1, 1], output: 0 },
      ],
    },
    specs: {
      family: '74LS TTL',
      package: '14-Pin DIP',
      supply: '+5.0V (VCC=14, GND=7)',
      propagationDelay: '~9 ns typical',
      totalGatesInside: 4,
      exposedOnBoard: 4,
    },
    demoLessonId: 'teach-nand',
  },

  IC_7408: {
    type: 'IC_7408',
    partNumber: 'SN74LS08N',
    chipShort: '7408',
    gateName: 'AND',
    title: {
      en: '7408 Quad 2-Input AND Gate',
      ar: 'آي سي 7408 — 4 بوابات AND (الضرب المنطقي)',
    },
    summary: {
      en: 'Contains 4 independent 2-input AND gates. Output turns HIGH (1) ONLY when BOTH input A and input B are HIGH (1) at the same time.',
      ar: 'يحتوي على 4 بوابات AND مستقلة. لا تمر الكهرباء إلى المخرج (1) إلا عندما يكون كلا المدخلين A و B = 1 معاً.',
    },
    wiringNote: {
      en: 'Standard TTL quad pinout: bottom gates use (1,2→3) and (4,5→6); top gates use (9,10→8) and (12,13→11). Built directly into Column 0 row 2 on the bCube trainer.',
      ar: 'الترتيب القياسي: البوابات السفلية (1,2←3) و(4,5←6) والعلوية (9,10←8) و(12,13←11). مدمج بالعمود الأول على البوردة.',
    },
    equationPlain: 'Y = A · B',
    equationParts: [{ text: 'Y = A · B' }],
    vccPin: 14,
    gndPin: 7,
    layoutKind: 'standard-quad',
    internalGates: STANDARD_QUAD_GATES,
    truthTable: {
      inputLabels: ['A', 'B'],
      rows: [
        { inputs: [0, 0], output: 0 },
        { inputs: [0, 1], output: 0 },
        { inputs: [1, 0], output: 0 },
        { inputs: [1, 1], output: 1 },
      ],
    },
    specs: {
      family: '74LS TTL',
      package: '14-Pin DIP',
      supply: '+5.0V (VCC=14, GND=7)',
      propagationDelay: '~8 ns typical',
      totalGatesInside: 4,
      exposedOnBoard: 4,
    },
    demoLessonId: 'teach-and',
  },

  IC_7432: {
    type: 'IC_7432',
    partNumber: 'SN74LS32N',
    chipShort: '7432',
    gateName: 'OR',
    title: {
      en: '7432 Quad 2-Input OR Gate',
      ar: 'آي سي 7432 — 4 بوابات OR (الجمع المنطقي)',
    },
    summary: {
      en: 'Contains 4 independent 2-input OR gates. Output turns HIGH (1) whenever AT LEAST ONE input is HIGH (1), and is LOW (0) only when both inputs are 0.',
      ar: 'يحتوي على 4 بوابات OR مستقلة. تخرج كهرباء (1) إذا كان أي مدخل واحد على الأقل = 1، وتنقطع (0) فقط عند (0 و 0).',
    },
    wiringNote: {
      en: 'Follows standard quad gate pinout matching 7408 and 7400. Inputs on LEFT header (1,2,4,5,9,10,12,13), outputs on RIGHT header (3,6,8,11).',
      ar: 'يتطابق في ترتيب الأطراف مع 7408 و7400: المداخل على الهيدر الأيسر والمخارج على الهيدر الأيمن.',
    },
    equationPlain: 'Y = A + B',
    equationParts: [{ text: 'Y = A + B' }],
    vccPin: 14,
    gndPin: 7,
    layoutKind: 'standard-quad',
    internalGates: STANDARD_QUAD_GATES,
    truthTable: {
      inputLabels: ['A', 'B'],
      rows: [
        { inputs: [0, 0], output: 0 },
        { inputs: [0, 1], output: 1 },
        { inputs: [1, 0], output: 1 },
        { inputs: [1, 1], output: 1 },
      ],
    },
    specs: {
      family: '74LS TTL',
      package: '14-Pin DIP',
      supply: '+5.0V (VCC=14, GND=7)',
      propagationDelay: '~10 ns typical',
      totalGatesInside: 4,
      exposedOnBoard: 4,
    },
    demoLessonId: 'teach-or',
  },

  IC_7402: {
    type: 'IC_7402',
    partNumber: 'SN74LS02N',
    chipShort: '7402',
    gateName: 'NOR',
    title: {
      en: '7402 Quad 2-Input NOR Gate',
      ar: 'آي سي 7402 — 4 بوابات NOR (نفي OR)',
    },
    summary: {
      en: 'Contains 4 independent 2-input NOR gates. Output is HIGH (1) ONLY when BOTH inputs are LOW (0). Like NAND, NOR is also a universal gate.',
      ar: 'يحتوي على 4 بوابات NOR مستقلة. يخرج كهرباء (1) فقط عندما يكون كلا المدخلين = 0، وينقطع بمجرد وجود أي مدخل = 1.',
    },
    wiringNote: {
      en: 'HARDWARE PINOUT QUIRK: Inside the 7402 silicon chip, Pin 1, 4, 10, 13 are OUTPUTS and (2,3), (5,6), (8,9), (11,12) are INPUTS (reversed vs 7400/7408!). The bCube PCB automatically routes all inputs to the LEFT header and outputs to the RIGHT header.',
      ar: 'ملاحظة مهمة في التوصيل: داخل شريحة 7402 الحقيقية، الأطراف (1 و 4 و 10 و 13) هي المخارج والمداخل هي (2,3 و 5,6 و 8,9 و 11,12) بعكس 7408! قامت بوردة bCube بتوجيه المداخل لليسار والمخارج لليمين تلقائياً.',
    },
    equationPlain: 'Y = (A + B)′',
    equationParts: [
      { text: 'Y = ' },
      { text: 'A + B', overline: true },
    ],
    vccPin: 14,
    gndPin: 7,
    layoutKind: 'nor-quad',
    internalGates: NOR_QUAD_GATES,
    truthTable: {
      inputLabels: ['A', 'B'],
      rows: [
        { inputs: [0, 0], output: 1 },
        { inputs: [0, 1], output: 0 },
        { inputs: [1, 0], output: 0 },
        { inputs: [1, 1], output: 0 },
      ],
    },
    specs: {
      family: '74LS TTL',
      package: '14-Pin DIP',
      supply: '+5.0V (VCC=14, GND=7)',
      propagationDelay: '~10 ns typical',
      totalGatesInside: 4,
      exposedOnBoard: 4,
    },
    demoLessonId: 'teach-nor',
  },

  IC_7404: {
    type: 'IC_7404',
    partNumber: 'SN74LS04N',
    chipShort: '7404',
    gateName: 'NOT',
    title: {
      en: '7404 Hex Inverter (NOT Gate)',
      ar: 'آي سي 7404 — 6 عواكس منطقية (NOT)',
    },
    summary: {
      en: 'Contains 6 independent logic inverters inside the DIP-14 package. Always outputs the exact opposite logic level of its input (0 → 1, 1 → 0).',
      ar: 'يحتوي على 6 بوابات عكس (NOT) داخل الشريحة. يعكس الإشارة دائماً: المدخل 0 يُخرج 1، والمدخل 1 يُخرج 0.',
    },
    wiringNote: {
      en: 'Although the physical 7404 chip packs 6 inverters inside, the bCube trainer exposes the first 4 inverters (Pins 1→2, 3→4, 5→6, 9→8) on its white headers to align symmetrically with the other blocks.',
      ar: 'رغم احتواء الشريحة فعلياً على 6 عواكس بالداخل (الأطراف 11←10 و13←12 بالداخل)، توفر بوردة bCube أول 4 عواكس (1←2، 3←4، 5←6، 9←8) على أطراف التوصيل.',
    },
    equationPlain: 'Y = A′',
    equationParts: [
      { text: 'Y = ' },
      { text: 'A', overline: true },
    ],
    vccPin: 14,
    gndPin: 7,
    layoutKind: 'hex-not',
    internalGates: HEX_NOT_GATES,
    truthTable: {
      inputLabels: ['A'],
      rows: [
        { inputs: [0], output: 1 },
        { inputs: [1], output: 0 },
      ],
    },
    specs: {
      family: '74LS TTL',
      package: '14-Pin DIP',
      supply: '+5.0V (VCC=14, GND=7)',
      propagationDelay: '~9 ns typical',
      totalGatesInside: 6,
      exposedOnBoard: 4,
    },
    demoLessonId: 'teach-not',
  },

  IC_7486: {
    type: 'IC_7486',
    partNumber: 'SN74LS86N',
    chipShort: '7486',
    gateName: 'XOR',
    title: {
      en: '7486 Quad 2-Input XOR Gate',
      ar: 'آي سي 7486 — 4 بوابات XOR (عدم التطابق)',
    },
    summary: {
      en: 'Contains 4 Exclusive-OR gates. Output is HIGH (1) when the two inputs are DIFFERENT (0,1 or 1,0), and LOW (0) when both inputs match. Essential for binary Adders (Sum bit).',
      ar: 'يحتوي على 4 بوابات XOR. يخرج كهرباء (1) فقط عندما يختلف المدخلان (0 و 1)، وتنقطع إذا تشابها. وهي البوابة الأساسية لحساب ناتج الجمع في الـ Half Adder.',
    },
    wiringNote: {
      en: 'Mounted as a removable blue daughter module in Column 1 (3rd slot from top). Standard quad pinout: inputs (1,2), (4,5), (9,10), (12,13) on LEFT; outputs (3, 6, 8, 11) on RIGHT.',
      ar: 'مثبتة كوحدة منفصلة في العمود الثاني (الخانة الثالثة قبل الأخيرة). المداخل (1,2 و 4,5 و 9,10 و 12,13) يساراً والمخارج (3 و 6 و 8 و 11) يميناً.',
    },
    equationPlain: 'Y = A ⊕ B = A′·B + A·B′',
    equationParts: [
      { text: 'Y = A ⊕ B = ' },
      { text: 'A', overline: true },
      { text: '·B + A·' },
      { text: 'B', overline: true },
    ],
    vccPin: 14,
    gndPin: 7,
    layoutKind: 'standard-quad',
    internalGates: STANDARD_QUAD_GATES,
    truthTable: {
      inputLabels: ['A', 'B'],
      rows: [
        { inputs: [0, 0], output: 0 },
        { inputs: [0, 1], output: 1 },
        { inputs: [1, 0], output: 1 },
        { inputs: [1, 1], output: 0 },
      ],
    },
    specs: {
      family: '74LS TTL',
      package: '14-Pin DIP (Module)',
      supply: '+5.0V (VCC=14, GND=7)',
      propagationDelay: '~12 ns typical',
      totalGatesInside: 4,
      exposedOnBoard: 4,
    },
    demoLessonId: 'teach-xor',
  },
};

export interface IcPinWireConnection {
  wireId: string;
  pinNumber: number;
  gateIndex: number;
  pinRole: string;
  direction: 'input' | 'output';
  remoteLabel: string;
  signal: SignalLevel;
}

/**
 * Returns all currently wired jumper connections touching the inspected IC,
 * along with their pin number, gate role, remote socket, and live SignalLevel.
 */
export function getIcPinWireSummary(
  icType: ActiveGateModuleType,
  wires: WireSpec[],
  socketStates: Record<string, SignalLevel>
): IcPinWireConnection[] {
  const mod = ALL_MODULES.find((m) => m.id === icType);
  if (!mod || !mod.gates) return [];

  const pinRoleMap = new Map<number, { gateIndex: number; role: string; dir: 'input' | 'output' }>();
  for (const g of mod.gates) {
    g.inputPins.forEach((p, idx) => {
      pinRoleMap.set(p, {
        gateIndex: g.gateIndex,
        role: g.inputPins.length === 1 ? `G${g.gateIndex} In` : `G${g.gateIndex} In ${idx === 0 ? 'A' : 'B'}`,
        dir: 'input',
      });
    });
    pinRoleMap.set(g.outputPin, {
      gateIndex: g.gateIndex,
      role: `G${g.gateIndex} Out`,
      dir: 'output',
    });
  }

  const results: IcPinWireConnection[] = [];
  for (const w of wires) {
    const sFrom = SOCKET_MAP[w.fromSocketId];
    const sTo = SOCKET_MAP[w.toSocketId];
    if (!sFrom || !sTo) continue;

    if (sFrom.moduleId === icType && sFrom.pinNumber !== undefined) {
      const info = pinRoleMap.get(sFrom.pinNumber);
      results.push({
        wireId: w.id,
        pinNumber: sFrom.pinNumber,
        gateIndex: info?.gateIndex ?? 0,
        pinRole: info?.role ?? `Pin ${sFrom.pinNumber}`,
        direction: info?.dir ?? 'input',
        remoteLabel: sTo.tooltip.split('•')[0].trim(),
        signal: socketStates[sFrom.id] ?? 'FLOATING',
      });
    }
    if (sTo.moduleId === icType && sTo.pinNumber !== undefined) {
      const info = pinRoleMap.get(sTo.pinNumber);
      results.push({
        wireId: w.id,
        pinNumber: sTo.pinNumber,
        gateIndex: info?.gateIndex ?? 0,
        pinRole: info?.role ?? `Pin ${sTo.pinNumber}`,
        direction: info?.dir ?? 'input',
        remoteLabel: sFrom.tooltip.split('•')[0].trim(),
        signal: socketStates[sTo.id] ?? 'FLOATING',
      });
    }
  }

  return results.sort((a, b) => a.pinNumber - b.pinNumber);
}
