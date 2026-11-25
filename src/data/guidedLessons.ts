/* =========================================================================
   bCube Step-by-Step Interactive Visual & Written Instructor Lessons
   Zero React or Three.js imports — supports English ('en') & Arabic ('ar').
   ========================================================================= */

import type { WireSpec } from '../engine/LogicEngine';
import { SOCKET_MAP } from '../schema/boardSchema';
import type { TeachingLanguage } from '../store/useSimulatorStore';

export type GuidedStepSpec =
  | {
      kind: 'wire';
      id: string;
      fromSocketId: string;
      toSocketId: string;
      fromNodeId: string;
      toNodeId: string;
      wireColor: string;
      instruction: Record<TeachingLanguage, string>;
      why: Record<TeachingLanguage, string>;
    }
  | {
      kind: 'switch';
      id: string;
      requiredSwitches: Record<string, boolean>;
      highlightSwitchIds: string[];
      instruction: Record<TeachingLanguage, string>;
      why: Record<TeachingLanguage, string>;
    };

export interface GuidedLessonSpec {
  id: string;
  title: Record<TeachingLanguage, string>;
  subtitle: Record<TeachingLanguage, string>;
  steps: GuidedStepSpec[];
}

export const GUIDED_LESSONS: GuidedLessonSpec[] = [
  {
    id: 'lesson-not',
    title: {
      en: 'Lesson 1 — Inverter (NOT 7404)',
      ar: 'الدرس ١ — العاكس (NOT 7404)',
    },
    subtitle: {
      en: 'Learn how a NOT gate flips 0 to 1 and 1 to 0.',
      ar: 'تعلّم كيف تعكس بوابة NOT الإشارة من 0 إلى 1 والعكس.',
    },
    steps: [
      {
        kind: 'wire',
        id: 'not-1',
        fromSocketId: 'SLIDE_SWITCH:SW1:A',
        toSocketId: 'IC_7404:PIN1:A',
        fromNodeId: 'SLIDE_SWITCH:SW1',
        toNodeId: 'IC_7404:PIN1',
        wireColor: '#ef4444',
        instruction: {
          en: 'Connect Slide Switch SW1 (left) to NOT 7404 Pin 1.',
          ar: 'وصّل مفتاح SW1 (على اليسار) إلى الرجل 1 في بوابة NOT 7404.',
        },
        why: {
          en: 'SW1 sends a clean 0V or +5V logic input into Inverter Gate 1.',
          ar: 'يقوم SW1 بإدخال إشارة 0 أو 1 إلى مدخل العاكس الأول.',
        },
      },
      {
        kind: 'wire',
        id: 'not-2',
        fromSocketId: 'IC_7404:PIN2:A',
        toSocketId: 'LED_RED:RED_D1:A',
        fromNodeId: 'IC_7404:PIN2',
        toNodeId: 'LED_RED:RED_D1',
        wireColor: '#22c55e',
        instruction: {
          en: 'Connect NOT 7404 output Pin 2 to Red LED D1.',
          ar: 'وصّل مخرج بوابة NOT الرجل 2 إلى اللمبة الحمراء D1.',
        },
        why: {
          en: 'Since SW1 is OFF (0), NOT flips it to 1 (+5V) and RED D1 lights up!',
          ar: 'لأن SW1 مغلق (0)، تعكسه البوابة إلى (1) فتضيء اللمبة D1 فوراً!',
        },
      },
      {
        kind: 'switch',
        id: 'not-3',
        requiredSwitches: { SW1: true },
        highlightSwitchIds: ['SW1'],
        instruction: {
          en: 'Click Switch SW1 ON to invert +5V back to 0V (LED turns OFF).',
          ar: 'اضغط على SW1 لتشغيله (ON) وشاهد انطفاء اللمبة لأن العاكس يحوّل 1 إلى 0.',
        },
        why: {
          en: 'NOT Output = !A. Flip SW1 ON/OFF to verify both states.',
          ar: 'المخرج يساوي عكس المدخل دائماً (!A).',
        },
      },
    ],
  },
  {
    id: 'lesson-and',
    title: {
      en: 'Lesson 2 — Basic AND Gate (7408)',
      ar: 'الدرس ٢ — بوابة AND الأساسية (7408)',
    },
    subtitle: {
      en: 'Output is 1 ONLY when both inputs A and B are 1.',
      ar: 'المخرج يضيء (1) فقط عندما يكون المفتاحان A و B على وضع التشغيل (1).',
    },
    steps: [
      {
        kind: 'wire',
        id: 'and-1',
        fromSocketId: 'SLIDE_SWITCH:SW1:A',
        toSocketId: 'IC_7408:PIN1:A',
        fromNodeId: 'SLIDE_SWITCH:SW1',
        toNodeId: 'IC_7408:PIN1',
        wireColor: '#ef4444',
        instruction: {
          en: 'Connect SW1 to 7408 AND Gate 1 Input A (Pin 1).',
          ar: 'وصّل مفتاح SW1 إلى مدخل بوابة AND الأول (الرجل 1).',
        },
        why: {
          en: 'Pin 1 receives the first Boolean variable A.',
          ar: 'الرجل 1 تستقبل المدخل الأول A.',
        },
      },
      {
        kind: 'wire',
        id: 'and-2',
        fromSocketId: 'SLIDE_SWITCH:SW2:A',
        toSocketId: 'IC_7408:PIN2:A',
        fromNodeId: 'SLIDE_SWITCH:SW2',
        toNodeId: 'IC_7408:PIN2',
        wireColor: '#eab308',
        instruction: {
          en: 'Connect SW2 to 7408 AND Gate 1 Input B (Pin 2).',
          ar: 'وصّل مفتاح SW2 إلى مدخل بوابة AND الثاني (الرجل 2).',
        },
        why: {
          en: 'Pin 2 completes both required inputs for Gate 1.',
          ar: 'الرجل 2 تستقبل المدخل الثاني B لاكتمال البوابة.',
        },
      },
      {
        kind: 'wire',
        id: 'and-3',
        fromSocketId: 'IC_7408:PIN3:A',
        toSocketId: 'LED_RED:RED_D1:A',
        fromNodeId: 'IC_7408:PIN3',
        toNodeId: 'LED_RED:RED_D1',
        wireColor: '#22c55e',
        instruction: {
          en: 'Connect 7408 Output Pin 3 to Red LED D1.',
          ar: 'وصّل مخرج بوابة AND الرجل 3 إلى اللمبة الحمراء D1.',
        },
        why: {
          en: 'Pin 3 drives the LED based on A · B.',
          ar: 'الرجل 3 هي المخرج وتُظهر ناتج الضرب المنطقي A · B.',
        },
      },
      {
        kind: 'switch',
        id: 'and-4',
        requiredSwitches: { SW1: true, SW2: true },
        highlightSwitchIds: ['SW1', 'SW2'],
        instruction: {
          en: 'Turn BOTH SW1 and SW2 ON to light Red LED D1.',
          ar: 'شغّل المفتاحين SW1 و SW2 معاً (ON) لتضيء اللمبة D1.',
        },
        why: {
          en: 'AND requires A = 1 AND B = 1 simultaneously.',
          ar: 'بوابة AND لا تمرر الكهرباء إلا إذا كان كلا المدخلين 1.',
        },
      },
    ],
  },
  {
    id: 'lesson-or',
    title: {
      en: 'Lesson 3 — Basic OR Gate (7432)',
      ar: 'الدرس ٣ — بوابة OR الأساسية (7432)',
    },
    subtitle: {
      en: 'Output turns 1 if ANY input (A or B) is 1.',
      ar: 'المخرج يضيء (1) إذا كان أي مفتاح منهما على وضع التشغيل (1).',
    },
    steps: [
      {
        kind: 'wire',
        id: 'or-1',
        fromSocketId: 'SLIDE_SWITCH:SW1:A',
        toSocketId: 'IC_7432:PIN1:A',
        fromNodeId: 'SLIDE_SWITCH:SW1',
        toNodeId: 'IC_7432:PIN1',
        wireColor: '#ef4444',
        instruction: {
          en: 'Connect SW1 to 7432 OR Pin 1.',
          ar: 'وصّل مفتاح SW1 إلى مدخل بوابة OR الأول (الرجل 1).',
        },
        why: {
          en: 'Pin 1 is the first input of OR Gate 1.',
          ar: 'الرجل 1 هي المدخل الأول لبوابة OR.',
        },
      },
      {
        kind: 'wire',
        id: 'or-2',
        fromSocketId: 'SLIDE_SWITCH:SW2:A',
        toSocketId: 'IC_7432:PIN2:A',
        fromNodeId: 'SLIDE_SWITCH:SW2',
        toNodeId: 'IC_7432:PIN2',
        wireColor: '#eab308',
        instruction: {
          en: 'Connect SW2 to 7432 OR Pin 2.',
          ar: 'وصّل مفتاح SW2 إلى مدخل بوابة OR الثاني (الرجل 2).',
        },
        why: {
          en: 'Pin 2 provides the second OR input.',
          ar: 'الرجل 2 هي المدخل الثاني لبوابة OR.',
        },
      },
      {
        kind: 'wire',
        id: 'or-3',
        fromSocketId: 'IC_7432:PIN3:A',
        toSocketId: 'LED_RED:RED_D1:A',
        fromNodeId: 'IC_7432:PIN3',
        toNodeId: 'LED_RED:RED_D1',
        wireColor: '#22c55e',
        instruction: {
          en: 'Connect 7432 Output Pin 3 to Red LED D1.',
          ar: 'وصّل مخرج بوابة OR الرجل 3 إلى اللمبة الحمراء D1.',
        },
        why: {
          en: 'LED D1 displays A + B.',
          ar: 'اللمبة D1 تعرض ناتج الجمع المنطقي A + B.',
        },
      },
      {
        kind: 'switch',
        id: 'or-4',
        requiredSwitches: { SW1: true },
        highlightSwitchIds: ['SW1'],
        instruction: {
          en: 'Flip SW1 ON — OR lights up even while SW2 is OFF!',
          ar: 'شغّل SW1 فقط — ستضيء اللمبة حتى لو كان SW2 مغلقاً!',
        },
        why: {
          en: '1 + 0 = 1 in Boolean OR logic.',
          ar: 'في بوابة OR يكفي مدخل واحد قيمته 1 لتمرير الكهرباء.',
        },
      },
    ],
  },
  {
    id: 'lesson-xor',
    title: {
      en: 'Lesson 4 — Exclusive OR (XOR 7486)',
      ar: 'الدرس ٤ — بوابة الاختلاف (XOR 7486)',
    },
    subtitle: {
      en: 'Output is 1 ONLY when inputs are different.',
      ar: 'المخرج يضيء (1) فقط عندما يكون المفتاحان مختلفين.',
    },
    steps: [
      {
        kind: 'wire',
        id: 'xor-1',
        fromSocketId: 'SLIDE_SWITCH:SW1:A',
        toSocketId: 'IC_7486:PIN1:A',
        fromNodeId: 'SLIDE_SWITCH:SW1',
        toNodeId: 'IC_7486:PIN1',
        wireColor: '#ef4444',
        instruction: {
          en: 'Connect SW1 to XOR 7486 daughter module Pin 1.',
          ar: 'وصّل SW1 إلى موديول XOR 7486 الرجل 1.',
        },
        why: {
          en: 'XOR 7486 sits in Column 1 on brass standoffs.',
          ar: 'شريحة XOR 7486 موجودة في العمود الثاني من البوردة.',
        },
      },
      {
        kind: 'wire',
        id: 'xor-2',
        fromSocketId: 'SLIDE_SWITCH:SW2:A',
        toSocketId: 'IC_7486:PIN2:A',
        fromNodeId: 'SLIDE_SWITCH:SW2',
        toNodeId: 'IC_7486:PIN2',
        wireColor: '#eab308',
        instruction: {
          en: 'Connect SW2 to XOR 7486 Pin 2.',
          ar: 'وصّل SW2 إلى موديول XOR 7486 الرجل 2.',
        },
        why: {
          en: 'Compares SW1 against SW2.',
          ar: 'تقارن البوابة بين قيمة SW1 و SW2.',
        },
      },
      {
        kind: 'wire',
        id: 'xor-3',
        fromSocketId: 'IC_7486:PIN3:A',
        toSocketId: 'LED_RED:RED_D1:A',
        fromNodeId: 'IC_7486:PIN3',
        toNodeId: 'LED_RED:RED_D1',
        wireColor: '#22c55e',
        instruction: {
          en: 'Connect XOR 7486 Output Pin 3 to Red LED D1.',
          ar: 'وصّل مخرج XOR الرجل 3 إلى اللمبة الحمراء D1.',
        },
        why: {
          en: 'Displays A ⊕ B (Sum bit in binary addition).',
          ar: 'يظهر ناتج الاختلاف A ⊕ B.',
        },
      },
      {
        kind: 'switch',
        id: 'xor-4',
        requiredSwitches: { SW1: true, SW2: false },
        highlightSwitchIds: ['SW1'],
        instruction: {
          en: 'Turn SW1 ON while keeping SW2 OFF (different inputs -> LED ON).',
          ar: 'شغّل SW1 واترك SW2 مغلقاً (المدخلان مختلفان فتضيء اللمبة).',
        },
        why: {
          en: '1 ⊕ 0 = 1, while 1 ⊕ 1 = 0.',
          ar: 'عند اختلاف المفتاحين يكون الناتج 1، وعند تشابههما يكون 0.',
        },
      },
    ],
  },
  {
    id: 'lesson-half-adder',
    title: {
      en: 'Lesson 5 — Half Adder (7486 + 7408)',
      ar: 'الدرس ٥ — الجامع النصفي (Half Adder)',
    },
    subtitle: {
      en: 'Use dual-hole branching to compute binary Sum and Carry together.',
      ar: 'استخدم الفتحتين المزدوجتين لحساب المجموع (Sum) والباقي (Carry) معاً.',
    },
    steps: [
      {
        kind: 'wire',
        id: 'ha-1',
        fromSocketId: 'SLIDE_SWITCH:SW1:A',
        toSocketId: 'IC_7486:PIN1:A',
        fromNodeId: 'SLIDE_SWITCH:SW1',
        toNodeId: 'IC_7486:PIN1',
        wireColor: '#ef4444',
        instruction: {
          en: 'Wire SW1 (Hole A) to XOR 7486 Pin 1.',
          ar: 'وصّل SW1 (الفتحة A) إلى بوابة XOR الرجل 1.',
        },
        why: {
          en: 'First input X for the Sum gate.',
          ar: 'المدخل الأول X لبوابة المجموع Sum.',
        },
      },
      {
        kind: 'wire',
        id: 'ha-2',
        fromSocketId: 'SLIDE_SWITCH:SW2:A',
        toSocketId: 'IC_7486:PIN2:A',
        fromNodeId: 'SLIDE_SWITCH:SW2',
        toNodeId: 'IC_7486:PIN2',
        wireColor: '#eab308',
        instruction: {
          en: 'Wire SW2 (Hole A) to XOR 7486 Pin 2.',
          ar: 'وصّل SW2 (الفتحة A) إلى بوابة XOR الرجل 2.',
        },
        why: {
          en: 'Second input Y for the Sum gate.',
          ar: 'المدخل الثاني Y لبوابة المجموع Sum.',
        },
      },
      {
        kind: 'wire',
        id: 'ha-3',
        fromSocketId: 'SLIDE_SWITCH:SW1:B',
        toSocketId: 'IC_7408:PIN1:A',
        fromNodeId: 'SLIDE_SWITCH:SW1',
        toNodeId: 'IC_7408:PIN1',
        wireColor: '#f97316',
        instruction: {
          en: 'Branch SW1 (Hole B) to AND 7408 Pin 1.',
          ar: 'فرّع SW1 (الفتحة B) إلى بوابة AND الرجل 1.',
        },
        why: {
          en: 'Dual holes let SW1 feed both XOR and AND at the same time.',
          ar: 'الفتحة الثانية المزدوجة توصل نفس إشارة SW1 إلى بوابة AND.',
        },
      },
      {
        kind: 'wire',
        id: 'ha-4',
        fromSocketId: 'SLIDE_SWITCH:SW2:B',
        toSocketId: 'IC_7408:PIN2:A',
        fromNodeId: 'SLIDE_SWITCH:SW2',
        toNodeId: 'IC_7408:PIN2',
        wireColor: '#f8fafc',
        instruction: {
          en: 'Branch SW2 (Hole B) to AND 7408 Pin 2.',
          ar: 'فرّع SW2 (الفتحة B) إلى بوابة AND الرجل 2.',
        },
        why: {
          en: 'Feeds Y into the Carry gate.',
          ar: 'يوصل قيمة Y إلى بوابة الباقي Carry.',
        },
      },
      {
        kind: 'wire',
        id: 'ha-5',
        fromSocketId: 'IC_7486:PIN3:A',
        toSocketId: 'LED_RED:RED_D1:A',
        fromNodeId: 'IC_7486:PIN3',
        toNodeId: 'LED_RED:RED_D1',
        wireColor: '#22c55e',
        instruction: {
          en: 'Wire XOR Pin 3 (Sum) to Red LED D1.',
          ar: 'وصّل مخرج XOR الرجل 3 (Sum) إلى اللمبة الحمراء D1.',
        },
        why: {
          en: 'Red LED D1 shows the Sum bit (X ⊕ Y).',
          ar: 'اللمبة الحمراء تعرض خانة الآحاد (Sum).',
        },
      },
      {
        kind: 'wire',
        id: 'ha-6',
        fromSocketId: 'IC_7408:PIN3:A',
        toSocketId: 'LED_BLUE:BLUE_D1:A',
        fromNodeId: 'IC_7408:PIN3',
        toNodeId: 'LED_BLUE:BLUE_D1',
        wireColor: '#3b82f6',
        instruction: {
          en: 'Wire AND Pin 3 (Carry) to Blue LED D1.',
          ar: 'وصّل مخرج AND الرجل 3 (Carry) إلى اللمبة الزرقاء D1.',
        },
        why: {
          en: 'Blue LED D1 shows the Carry bit (X · Y).',
          ar: 'اللمبة الزرقاء تعرض الباقي (Carry).',
        },
      },
      {
        kind: 'switch',
        id: 'ha-7',
        requiredSwitches: { SW1: true, SW2: true },
        highlightSwitchIds: ['SW1', 'SW2'],
        instruction: {
          en: 'Turn BOTH SW1 and SW2 ON (1 + 1 = 10 binary: Blue Carry ON, Red Sum OFF).',
          ar: 'شغّل SW1 و SW2 معاً (1 + 1 = 10 بالثنائي: تضيء الزرقاء وتنطفئ الحمراء).',
        },
        why: {
          en: 'Binary addition 1 + 1 produces Sum = 0 and Carry = 1!',
          ar: 'جمع 1 + 1 بالثنائي يعطي 0 ومعنا 1 (Carry = 1).',
        },
      },
    ],
  },
];

export function isGuidedStepComplete(
  step: GuidedStepSpec,
  wires: WireSpec[],
  switches: Record<string, boolean>
): boolean {
  if (step.kind === 'switch') {
    return Object.entries(step.requiredSwitches).every(
      ([swId, expected]) => Boolean(switches[swId]) === expected
    );
  }
  return wires.some((w) => {
    const aNode = SOCKET_MAP[w.fromSocketId]?.nodeId;
    const bNode = SOCKET_MAP[w.toSocketId]?.nodeId;
    return (
      (aNode === step.fromNodeId && bNode === step.toNodeId) ||
      (aNode === step.toNodeId && bNode === step.fromNodeId)
    );
  });
}

export function getCurrentGuidedStepIndex(
  lesson: GuidedLessonSpec,
  wires: WireSpec[],
  switches: Record<string, boolean>
): number {
  for (let i = 0; i < lesson.steps.length; i++) {
    if (!isGuidedStepComplete(lesson.steps[i], wires, switches)) {
      return i;
    }
  }
  return lesson.steps.length;
}
