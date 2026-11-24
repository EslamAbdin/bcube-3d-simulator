import { describe, expect, it } from 'vitest';
import {
  TEACHING_LESSONS,
  buildLiveGateExplanations,
  describeSignalForTeaching,
} from '../../data/teachingContent';
import { runSimulation } from '../LogicEngine';
import { MODULE_MAP, SOCKET_MAP } from '../../schema/boardSchema';

describe('bCube Real Hardware Placement & Bilingual Teaching Mode', () => {
  it('matches the real bCube kit 5-module Column 0 (NAND, AND, OR, NOR, NOT) and Column 1 XOR slot', () => {
    const col0 = ['IC_7400', 'IC_7408', 'IC_7432', 'IC_7402', 'IC_7404'];
    col0.forEach((id, row) => {
      const mod = MODULE_MAP[id];
      expect(mod?.status).toBe('active');
      expect(mod?.gridPos).toEqual({ row, col: 0 });
      expect(mod?.isDaughterModule).toBe(false);
    });

    const ic7486 = MODULE_MAP.IC_7486;
    expect(ic7486?.status).toBe('active');
    expect(ic7486?.gridPos).toEqual({ row: 2, col: 1 });
    expect(ic7486?.isDaughterModule).toBe(true);
  });

  it('has valid non-looping socket references across all 7 teaching lessons', () => {
    expect(TEACHING_LESSONS.length).toBe(7);
    for (const lesson of TEACHING_LESSONS) {
      expect(lesson.title.en.length).toBeGreaterThan(2);
      expect(lesson.title.ar.length).toBeGreaterThan(2);
      for (const w of lesson.wires) {
        expect(SOCKET_MAP[w.fromSocketId]).toBeDefined();
        expect(SOCKET_MAP[w.toSocketId]).toBeDefined();
        expect(w.fromSocketId).not.toBe(w.toSocketId);
      }
    }
  });

  it('explains electricity passing vs cut off accurately in both English and Arabic', () => {
    const andLesson = TEACHING_LESSONS.find((l) => l.id === 'teach-and')!;

    // Cut-off case: SW1=1, SW2=0 -> output cut off (0)
    const simCutoff = runSimulation({
      switches: { SW1: true, SW2: false },
      buttons: {},
      wires: andLesson.wires,
    });
    const expCutoffEn = buildLiveGateExplanations(andLesson.wires, simCutoff.socketStates, 'en');
    const expCutoffAr = buildLiveGateExplanations(andLesson.wires, simCutoff.socketStates, 'ar');

    expect(expCutoffEn).toHaveLength(1);
    expect(expCutoffEn[0].status).toBe('cutoff');
    expect(expCutoffEn[0].reason).toContain('cut off');
    expect(expCutoffAr[0].status).toBe('cutoff');
    expect(expCutoffAr[0].reason).toContain('مقطوعة');

    // Flowing case: SW1=1, SW2=1 -> output HIGH (1)
    const simFlow = runSimulation({
      switches: { SW1: true, SW2: true },
      buttons: {},
      wires: andLesson.wires,
    });
    const expFlowEn = buildLiveGateExplanations(andLesson.wires, simFlow.socketStates, 'en');
    const expFlowAr = buildLiveGateExplanations(andLesson.wires, simFlow.socketStates, 'ar');

    expect(expFlowEn[0].status).toBe('flowing');
    expect(expFlowEn[0].output.level).toBe('HIGH');
    expect(expFlowAr[0].status).toBe('flowing');
    expect(expFlowAr[0].reason).toContain('تمرّر الكهرباء');
  });

  it('provides concise bilingual hover signal descriptions', () => {
    expect(describeSignalForTeaching('HIGH', 'en')).toContain('ON');
    expect(describeSignalForTeaching('HIGH', 'ar')).toContain('واصلة');
    expect(describeSignalForTeaching('LOW', 'en')).toContain('Cut Off');
    expect(describeSignalForTeaching('LOW', 'ar')).toContain('مقطوعة');
  });
});
