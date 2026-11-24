/* =========================================================================
   bCube Bilingual Teaching Mode Data & Live Circuit Electricity Explainer
   Pure TypeScript (zero React/Three imports) — supports English ('en') & Arabic ('ar').
   ========================================================================= */

import type { WireSpec } from '../engine/LogicEngine';
import type { SignalLevel } from '../engine/gateEvaluators';
import {
  ALL_MODULES,
  SOCKET_MAP,
  type ActiveGateModuleType,
} from '../schema/boardSchema';
import type { TeachingLanguage } from '../store/useSimulatorStore';

export interface TeachingCopy {
  panelTitle: string;
  switchLangLabel: string;
  collapse: string;
  expand: string;
  close: string;
  legendTitle: string;
  legendHigh: string;
  legendLow: string;
  legendFloating: string;
  legendConflict: string;
  liveTitle: string;
  emptyLiveHint: string;
  lessonsTitle: string;
  flowingBadge: string;
  cutoffBadge: string;
  floatingBadge: string;
  conflictBadge: string;
  inputsLabel: string;
  outputLabel: string;
  pinPrefix: string;
}

export const TEACHING_COPY: Record<TeachingLanguage, TeachingCopy> = {
  en: {
    panelTitle: 'Teaching Mode',
    switchLangLabel: 'عربي',
    collapse: 'Hide',
    expand: 'Show',
    close: 'Close',
    legendTitle: 'Electricity Guide on the Board',
    legendHigh: '1 (+5V) Glowing Green = Electricity ON & flowing',
    legendLow: '0 (0V) Red Line/LED = Electricity Cut Off',
    legendFloating: 'Unwired = Open / Floating (no wire)',
    legendConflict: 'Amber = Conflict! Two outputs fighting on 1 wire',
    liveTitle: 'What Is Happening Now',
    emptyLiveHint:
      'Pick any lesson below to wire a gate automatically, or connect a switch to a gate pin to watch electricity flow.',
    lessonsTitle: 'Try a Gate (1-Click Lesson)',
    flowingBadge: 'Electricity ON (1)',
    cutoffBadge: 'Cut Off (0)',
    floatingBadge: 'Open / Unwired',
    conflictBadge: 'Short Conflict!',
    inputsLabel: 'Inputs',
    outputLabel: 'Out',
    pinPrefix: 'Pin',
  },
  ar: {
    panelTitle: 'وضع الشرح التعليمي',
    switchLangLabel: 'EN',
    collapse: 'تصغير',
    expand: 'عرض',
    close: 'إغلاق',
    legendTitle: 'دليل الكهرباء على البوردة',
    legendHigh: '1 (+5V) أخضر مضيء = الكهرباء واصلة وتمر',
    legendLow: '0 (0V) أحمر = الكهرباء مقطوعة (لا يمر تيار)',
    legendFloating: 'غير موصل = طرف مفتوح بدون سلك',
    legendConflict: 'برتقالي = تعارض! مخرجان متصلان ببعض',
    liveTitle: 'ماذا يحدث الآن؟',
    emptyLiveHint:
      'اختر أي درس بالأسفل لتوصيل البوابة تلقائياً، أو وصّل مفتاحاً بالبوابة لتشاهد سريان الكهرباء وانقطاعها.',
    lessonsTitle: 'جرّب بوابة (توصيل بضغطة واحدة)',
    flowingBadge: 'الكهرباء واصلة (1)',
    cutoffBadge: 'الكهرباء مقطوعة (0)',
    floatingBadge: 'غير موصل',
    conflictBadge: 'تعارض تيار!',
    inputsLabel: 'المداخل',
    outputLabel: 'المخرج',
    pinPrefix: 'رجل',
  },
};

export interface TeachingLesson {
  id: string;
  chipTag: string;
  title: Record<TeachingLanguage, string>;
  summary: Record<TeachingLanguage, string>;
  controlsHint: Record<TeachingLanguage, string>;
  initialSwitches: Record<string, boolean>;
  wires: WireSpec[];
}

export const TEACHING_LESSONS: TeachingLesson[] = [
  {
    id: 'teach-not',
    chipTag: 'NOT 7404',
    title: {
      en: 'NOT Gate (Inverter)',
      ar: 'بوابة NOT (العاكس 7404)',
    },
    summary: {
      en: 'Flips electricity: OFF (0) becomes ON (1), and ON (1) cuts off to 0.',
      ar: 'تعكس الكهرباء: إذا قطعت المفتاح (0) تُخرج كهرباء (1)، وإذا وصلته (1) تقطع المخرج (0).',
    },
    controlsHint: {
      en: 'Flip SW1 between OFF and ON to watch the inverter flip electricity.',
      ar: 'حرّك المفتاح SW1 بين OFF و ON وشاهد انعكاس الكهرباء.',
    },
    initialSwitches: { SW1: false },
    wires: [
      { id: 'teach-not-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7404:PIN1:A', color: '#eab308' },
      { id: 'teach-not-2', fromSocketId: 'IC_7404:PIN2:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'teach-and',
    chipTag: 'AND 7408',
    title: {
      en: 'AND Gate (7408)',
      ar: 'بوابة AND (الضرب 7408)',
    },
    summary: {
      en: 'Electricity passes ONLY when BOTH inputs are 1. Currently SW1=1, SW2=0 so output is cut off!',
      ar: 'الكهرباء تمر فقط عندما يكون المدخلان = 1 معاً. الآن SW1=1 و SW2=0 فالكهرباء مقطوعة!',
    },
    controlsHint: {
      en: 'Switch SW2 ON so both inputs = 1 and watch the green line light up RED D1!',
      ar: 'شغّل SW2 لكي يصبح المدخلان = 1 وشاهد الخط الأخضر يضيء اللمبة RED D1!',
    },
    initialSwitches: { SW1: true, SW2: false },
    wires: [
      { id: 'teach-and-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7408:PIN1:A', color: '#ef4444' },
      { id: 'teach-and-2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7408:PIN2:A', color: '#eab308' },
      { id: 'teach-and-3', fromSocketId: 'IC_7408:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'teach-or',
    chipTag: 'OR 7432',
    title: {
      en: 'OR Gate (7432)',
      ar: 'بوابة OR (الجمع 7432)',
    },
    summary: {
      en: 'Electricity passes if ANY input is 1. Only cuts off when BOTH inputs are 0.',
      ar: 'تمر الكهرباء إذا كان أي مدخل = 1 على الأقل، وتنقطع فقط إذا كان المدخلان = 0.',
    },
    controlsHint: {
      en: 'Turn either SW1 or SW2 ON to pass electricity through 7432.',
      ar: 'شغّل SW1 أو SW2 لتمر الكهرباء عبر بوابة OR.',
    },
    initialSwitches: { SW1: true, SW2: false },
    wires: [
      { id: 'teach-or-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7432:PIN1:A', color: '#ef4444' },
      { id: 'teach-or-2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7432:PIN2:A', color: '#3b82f6' },
      { id: 'teach-or-3', fromSocketId: 'IC_7432:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'teach-nand',
    chipTag: 'NAND 7400',
    title: {
      en: 'NAND Gate (7400)',
      ar: 'بوابة NAND (نفي AND 7400)',
    },
    summary: {
      en: 'Opposite of AND: stays ON unless BOTH inputs are 1 (then electricity cuts off!).',
      ar: 'عكس AND تماماً: تظل الكهرباء واصلة دائماً وتنقطع فقط عندما يصبح المدخلان = 1 معاً.',
    },
    controlsHint: {
      en: 'Turn BOTH SW1 and SW2 ON to see NAND cut off the output.',
      ar: 'شغّل SW1 و SW2 معاً لترى البوابة تقطع الكهرباء عن المخرج.',
    },
    initialSwitches: { SW1: true, SW2: false },
    wires: [
      { id: 'teach-nand-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7400:PIN1:A', color: '#ef4444' },
      { id: 'teach-nand-2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7400:PIN2:A', color: '#eab308' },
      { id: 'teach-nand-3', fromSocketId: 'IC_7400:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#f97316' },
    ],
  },
  {
    id: 'teach-nor',
    chipTag: 'NOR 7402',
    title: {
      en: 'NOR Gate (7402)',
      ar: 'بوابة NOR (نفي OR 7402)',
    },
    summary: {
      en: 'Opposite of OR: passes electricity ONLY when BOTH inputs are 0! (Note: inputs are Pins 2 & 3, output is Pin 1.)',
      ar: 'عكس OR: تخرج كهرباء فقط عندما يكون المدخلان = 0! (لاحظ في 7402: المداخل 2 و 3 والمخرج 1).',
    },
    controlsHint: {
      en: 'Both SW1 & SW2 are OFF so output is 1. Turn either ON to cut off output.',
      ar: 'كلا المفتاحين مطفأ فالخرج = 1. شغّل أياً منهما لتنقطع الكهرباء.',
    },
    initialSwitches: { SW1: false, SW2: false },
    wires: [
      { id: 'teach-nor-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7402:PIN2:A', color: '#3b82f6' },
      { id: 'teach-nor-2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7402:PIN3:A', color: '#eab308' },
      { id: 'teach-nor-3', fromSocketId: 'IC_7402:PIN1:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'teach-xor',
    chipTag: 'XOR 7486',
    title: {
      en: 'XOR Gate (7486)',
      ar: 'بوابة XOR (الاختلاف 7486)',
    },
    summary: {
      en: 'Passes electricity ONLY when the two inputs are DIFFERENT (one is 1 and one is 0).',
      ar: 'تمر الكهرباء فقط إذا كان المدخلان مختلفين (أحدهما 1 والآخر 0)، وتنقطع إذا تشابها.',
    },
    controlsHint: {
      en: 'Try (0,1) -> ON vs (1,1) -> Cut Off.',
      ar: 'جرّب الاختلاف (0 و 1) = مضيء، والتشابه (1 و 1) = مقطوع.',
    },
    initialSwitches: { SW1: true, SW2: false },
    wires: [
      { id: 'teach-xor-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7486:PIN1:A', color: '#ef4444' },
      { id: 'teach-xor-2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7486:PIN2:A', color: '#3b82f6' },
      { id: 'teach-xor-3', fromSocketId: 'IC_7486:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
    ],
  },
  {
    id: 'teach-half-adder',
    chipTag: 'Half Adder',
    title: {
      en: 'Half Adder (7486 + 7408)',
      ar: 'الجامع النصفي (XOR + AND)',
    },
    summary: {
      en: 'Adds SW1 + SW2 in binary: XOR (7486) makes Sum (RED D1) and AND (7408) makes Carry (BLUE D1).',
      ar: 'يجمع SW1 + SW2 بالنظام الثنائي: بوابة XOR تحسب المجموع (RED D1) وبوابة AND تحسب الحمل (BLUE D1).',
    },
    controlsHint: {
      en: 'Set both SW1 & SW2 ON -> 1 + 1 = 10 in binary (Carry BLUE D1 lights, Sum RED D1 cuts off!).',
      ar: 'شغّل SW1 و SW2 معاً ← 1 + 1 = 10 بالثنائي (تضيء BLUE D1 وتنطفئ RED D1!).',
    },
    initialSwitches: { SW1: true, SW2: true },
    wires: [
      { id: 'teach-ha-1', fromSocketId: 'SLIDE_SWITCH:SW1:A', toSocketId: 'IC_7486:PIN1:A', color: '#ef4444' },
      { id: 'teach-ha-2', fromSocketId: 'SLIDE_SWITCH:SW2:A', toSocketId: 'IC_7486:PIN2:A', color: '#eab308' },
      { id: 'teach-ha-3', fromSocketId: 'IC_7486:PIN1:B', toSocketId: 'IC_7408:PIN1:A', color: '#ef4444' },
      { id: 'teach-ha-4', fromSocketId: 'IC_7486:PIN2:B', toSocketId: 'IC_7408:PIN2:A', color: '#eab308' },
      { id: 'teach-ha-5', fromSocketId: 'IC_7486:PIN3:A', toSocketId: 'LED_RED:RED_D1:A', color: '#22c55e' },
      { id: 'teach-ha-6', fromSocketId: 'IC_7408:PIN3:A', toSocketId: 'LED_BLUE:BLUE_D1:A', color: '#3b82f6' },
    ],
  },
];

export interface LiveGateExplanation {
  key: string;
  moduleType: ActiveGateModuleType;
  gateIndex: number;
  title: string;
  inputs: Array<{ pinNumber: number; level: SignalLevel }>;
  output: { pinNumber: number; level: SignalLevel };
  status: 'flowing' | 'cutoff' | 'floating' | 'conflict';
  reason: string;
}

const GATE_SHORT_TITLES: Record<ActiveGateModuleType, Record<TeachingLanguage, string>> = {
  IC_7404: { en: 'NOT 7404', ar: 'NOT 7404 (العاكس)' },
  IC_7408: { en: 'AND 7408', ar: 'AND 7408 (و)' },
  IC_7432: { en: 'OR 7432', ar: 'OR 7432 (أو)' },
  IC_7400: { en: 'NAND 7400', ar: 'NAND 7400' },
  IC_7402: { en: 'NOR 7402', ar: 'NOR 7402' },
  IC_7486: { en: 'XOR 7486', ar: 'XOR 7486 (الاختلاف)' },
};

function bitText(level: SignalLevel): string {
  if (level === 'HIGH') return '1';
  if (level === 'LOW') return '0';
  if (level === 'CONFLICT') return '!';
  return '?';
}

function explainGateReason(
  type: ActiveGateModuleType,
  inputs: Array<{ pinNumber: number; level: SignalLevel }>,
  outLevel: SignalLevel,
  lang: TeachingLanguage
): string {
  if (outLevel === 'CONFLICT') {
    return lang === 'ar'
      ? 'يوجد تعارض كهربائي (مخرجان متصلان معاً 1 ضد 0)!'
      : 'Bus conflict detected: two driving outputs are fighting on the same line!';
  }
  if (outLevel === 'FLOATING') {
    return lang === 'ar'
      ? 'أحد مداخل هذه البوابة غير موصل بعد — وصّل كل المداخل لتشتغل.'
      : 'An input pin is still floating (unwired) — wire all inputs to activate.';
  }

  const a = inputs[0]?.level ?? 'FLOATING';
  const b = inputs[1]?.level ?? 'FLOATING';

  if (type === 'IC_7404') {
    if (outLevel === 'HIGH') {
      return lang === 'ar'
        ? `المدخل = 0 (مقطوع) ← العاكس NOT يفتح الكهرباء ويُخرج 1 (+5V)!`
        : `Input is 0 (cut off) → NOT flips it so electricity flows out (1)!`;
    }
    return lang === 'ar'
      ? `المدخل = 1 (واصل) ← العاكس NOT يقطع المخرج ليصبح 0.`
      : `Input is 1 (ON) → NOT inverts it, cutting off output electricity (0).`;
  }

  if (type === 'IC_7408') {
    if (outLevel === 'HIGH') {
      return lang === 'ar'
        ? `المدخلان = 1 و 1 معاً ← بوابة AND تمرّر الكهرباء للمخرج (1)!`
        : `Both inputs are 1 → AND passes electricity to the output (1)!`;
    }
    return lang === 'ar'
      ? `المدخلات (${bitText(a)}, ${bitText(b)}): بوابة AND تحتاج 1 و 1 معاً، لذلك الكهرباء مقطوعة (0).`
      : `Inputs are (${bitText(a)}, ${bitText(b)}) → AND needs BOTH = 1, so electricity is cut off (0).`;
  }

  if (type === 'IC_7432') {
    if (outLevel === 'HIGH') {
      return lang === 'ar'
        ? `أحد المدخلين = 1 (${bitText(a)}, ${bitText(b)}) ← بوابة OR تمرّر الكهرباء (1)!`
        : `At least one input is 1 (${bitText(a)}, ${bitText(b)}) → OR passes electricity (1)!`;
    }
    return lang === 'ar'
      ? `المدخلان = 0 و 0 ← لا توجد كهرباء على أي مدخل، فالمخرج مقطوع (0).`
      : `Both inputs are 0 → neither side has electricity, so output is cut off (0).`;
  }

  if (type === 'IC_7400') {
    if (outLevel === 'HIGH') {
      return lang === 'ar'
        ? `المدخلات (${bitText(a)}, ${bitText(b)}): ليست (1,1) ← بوابة NAND تُبقي الكهرباء واصلة (1).`
        : `Inputs (${bitText(a)}, ${bitText(b)}) are not both 1 → NAND keeps electricity ON (1).`;
    }
    return lang === 'ar'
      ? `المدخلان = 1 و 1 معاً ← بوابة NAND تعكس AND وتقطع الكهرباء (0)!`
      : `Both inputs are 1 → NAND flips AND and cuts off output electricity (0)!`;
  }

  if (type === 'IC_7402') {
    if (outLevel === 'HIGH') {
      return lang === 'ar'
        ? `المدخلان = 0 و 0 ← بوابة NOR تفتح الكهرباء فقط عند (0,0) فالمخرج = 1!`
        : `Both inputs are 0 → NOR passes electricity ONLY when both are 0 (1)!`;
    }
    return lang === 'ar'
      ? `المدخلات (${bitText(a)}, ${bitText(b)}): وجود 1 يقطع مخرج بوابة NOR فوراً (0).`
      : `Inputs (${bitText(a)}, ${bitText(b)}) include a 1 → NOR immediately cuts off output (0).`;
  }

  // IC_7486 XOR
  if (outLevel === 'HIGH') {
    return lang === 'ar'
      ? `المدخلان مختلفان (${bitText(a)} ≠ ${bitText(b)}) ← بوابة XOR تمرّر الكهرباء (1)!`
      : `Inputs differ (${bitText(a)} ≠ ${bitText(b)}) → XOR passes electricity (1)!`;
  }
  return lang === 'ar'
    ? `المدخلان متشابهان (${bitText(a)} = ${bitText(b)}) ← بوابة XOR تقطع الكهرباء (0).`
    : `Inputs match (${bitText(a)} = ${bitText(b)}) → XOR cuts off output electricity (0).`;
}

/**
 * Inspects currently wired active gates and builds plain-language Arabic or English
 * explanations showing where electricity is flowing vs cut off.
 */
export function buildLiveGateExplanations(
  wires: WireSpec[],
  socketStates: Record<string, SignalLevel>,
  lang: TeachingLanguage
): LiveGateExplanation[] {
  if (wires.length === 0) return [];

  const connectedNodes = new Set<string>();
  for (const w of wires) {
    const f = SOCKET_MAP[w.fromSocketId];
    const t = SOCKET_MAP[w.toSocketId];
    if (f) connectedNodes.add(f.nodeId);
    if (t) connectedNodes.add(t.nodeId);
  }

  const results: LiveGateExplanation[] = [];

  for (const mod of ALL_MODULES) {
    if (mod.zone !== 'center_grid' || mod.status !== 'active' || !mod.gates) continue;
    const gType = mod.type as ActiveGateModuleType;

    for (const gate of mod.gates) {
      const outSockId = `${mod.id}:PIN${gate.outputPin}:A`;
      const outNodeId = `NODE_${mod.id}_PIN${gate.outputPin}`;

      const hasWiredPin =
        connectedNodes.has(outNodeId) ||
        gate.inputPins.some((p) => connectedNodes.has(`NODE_${mod.id}_PIN${p}`));
      if (!hasWiredPin) continue;

      const inputs = gate.inputPins.map((p) => ({
        pinNumber: p,
        level: socketStates[`${mod.id}:PIN${p}:A`] ?? 'FLOATING',
      }));
      const outLevel = socketStates[outSockId] ?? 'FLOATING';

      const status: LiveGateExplanation['status'] =
        outLevel === 'CONFLICT'
          ? 'conflict'
          : outLevel === 'HIGH'
            ? 'flowing'
            : outLevel === 'LOW'
              ? 'cutoff'
              : 'floating';

      results.push({
        key: `${mod.id}:G${gate.gateIndex}`,
        moduleType: gType,
        gateIndex: gate.gateIndex,
        title: `${GATE_SHORT_TITLES[gType][lang]} • #${gate.gateIndex}`,
        inputs,
        output: { pinNumber: gate.outputPin, level: outLevel },
        status,
        reason: explainGateReason(gType, inputs, outLevel, lang),
      });
    }
  }

  return results;
}

export function describeSignalForTeaching(signal: SignalLevel, lang: TeachingLanguage): string {
  if (lang === 'ar') {
    if (signal === 'HIGH') return '1 • كهرباء واصلة (+5V)';
    if (signal === 'LOW') return '0 • كهرباء مقطوعة (0V)';
    if (signal === 'CONFLICT') return 'تعارض تيار!';
    return 'غير موصل (مفتوح)';
  }
  if (signal === 'HIGH') return '1 • Electricity ON (+5V)';
  if (signal === 'LOW') return '0 • Cut Off (0V)';
  if (signal === 'CONFLICT') return 'Bus Conflict!';
  return 'Open / Unwired';
}
