import { memo } from 'react';
import {
  GUIDED_LESSONS,
  getCurrentGuidedStepIndex,
} from '../data/guidedLessons';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playSlideClick, playWirePlug } from '../utils/soundEffects';

/**
 * Floating Step-by-Step Bilingual Instructor Card: guides students step-by-step
 * with live 3D board highlights, explanations, auto-advance, and "Do This Step".
 */
export const GuidedInstructorBar = memo(function GuidedInstructorBar() {
  const activeGuidedLessonId = useSimulatorStore((s) => s.activeGuidedLessonId);
  const startGuidedLesson = useSimulatorStore((s) => s.startGuidedLesson);
  const stopGuidedLesson = useSimulatorStore((s) => s.stopGuidedLesson);
  const teachingLang = useSimulatorStore((s) => s.teachingLang);
  const setTeachingLang = useSimulatorStore((s) => s.setTeachingLang);
  const wires = useSimulatorStore((s) => s.wires);
  const switches = useSimulatorStore((s) => s.switches);
  const addWire = useSimulatorStore((s) => s.addWire);
  const toggleSlideSwitch = useSimulatorStore((s) => s.toggleSlideSwitch);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);

  if (!activeGuidedLessonId) return null;

  const lessonIndex = Math.max(
    0,
    GUIDED_LESSONS.findIndex((l) => l.id === activeGuidedLessonId)
  );
  const lesson = GUIDED_LESSONS[lessonIndex];
  const stepIdx = getCurrentGuidedStepIndex(lesson, wires, switches);
  const totalSteps = lesson.steps.length;
  const isCompleted = stepIdx >= totalSteps;
  const currentStep = isCompleted ? null : lesson.steps[stepIdx];
  const nextLesson = GUIDED_LESSONS[(lessonIndex + 1) % GUIDED_LESSONS.length];
  const isArabic = teachingLang === 'ar';
  const progressPct = Math.round((Math.min(stepIdx, totalSteps) / totalSteps) * 100);

  const handleDoCurrentStep = () => {
    if (!currentStep) return;
    if (currentStep.kind === 'wire') {
      const ok = addWire(
        currentStep.fromSocketId,
        currentStep.toSocketId,
        currentStep.wireColor
      );
      if (ok && soundEnabled) playWirePlug();
    } else {
      let toggled = false;
      for (const [swId, targetVal] of Object.entries(currentStep.requiredSwitches)) {
        if (Boolean(switches[swId]) !== targetVal) {
          toggleSlideSwitch(swId);
          toggled = true;
        }
      }
      if (toggled && soundEnabled) playSlideClick(true);
    }
  };

  return (
    <aside
      dir={isArabic ? 'rtl' : 'ltr'}
      aria-label="Step-by-step Instructor Guide"
      className="pointer-events-auto fixed top-14 left-2.5 z-20 w-[calc(100vw-20px)] max-w-sm rounded-2xl border border-sky-500/45 bg-slate-900/92 p-3 text-slate-100 shadow-2xl backdrop-blur-lg sm:top-16 sm:left-3"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <select
          aria-label="Choose guided lesson"
          value={lesson.id}
          onChange={(e) => startGuidedLesson(e.target.value)}
          className="min-w-0 flex-1 cursor-pointer truncate rounded-lg border border-slate-700/80 bg-slate-950/90 px-2 py-1 text-xs font-semibold text-sky-200 focus:border-sky-400 focus:outline-none"
        >
          {GUIDED_LESSONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title[teachingLang]}
            </option>
          ))}
        </select>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setTeachingLang(isArabic ? 'en' : 'ar')}
            className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-700"
          >
            {isArabic ? 'EN' : 'عربي'}
          </button>
          <button
            type="button"
            aria-label="Close instructor guide"
            onClick={stopGuidedLesson}
            className="cursor-pointer rounded-lg px-2 py-0.5 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
        <span className="font-semibold text-sky-300">
          {isArabic
            ? isCompleted
              ? `تم الإنجاز (${totalSteps}/${totalSteps})`
              : `الخطوة ${stepIdx + 1} من ${totalSteps}`
            : isCompleted
              ? `Completed (${totalSteps}/${totalSteps})`
              : `Step ${stepIdx + 1} of ${totalSteps}`}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted ? 'bg-emerald-400' : 'bg-sky-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {isCompleted ? (
        <div className="mt-2.5 rounded-xl border border-emerald-500/45 bg-emerald-950/40 p-2.5 text-xs">
          <p className="font-semibold text-emerald-200">
            {isArabic
              ? 'أحسنت! تم بناء الدائرة واختبارها بنجاح.'
              : 'Great job! Circuit built & verified.'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-300">{lesson.subtitle[teachingLang]}</p>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => startGuidedLesson(lesson.id)}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
            >
              {isArabic ? 'إعادة' : 'Restart'}
            </button>
            <button
              type="button"
              onClick={() => startGuidedLesson(nextLesson.id)}
              className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
            >
              {isArabic ? 'الدرس التالي ←' : 'Next Lesson →'}
            </button>
          </div>
        </div>
      ) : (
        currentStep && (
          <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/65 p-2.5">
            <p className="text-xs font-semibold leading-snug text-white">
              {currentStep.instruction[teachingLang]}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              {currentStep.why[teachingLang]}
            </p>

            {currentStep.kind === 'wire' && (
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {isArabic ? 'البداية' : 'Start ring'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  {isArabic ? 'النهاية' : 'Target ring'}
                </span>
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => startGuidedLesson(lesson.id)}
                className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
              >
                {isArabic ? 'إعادة' : 'Restart'}
              </button>
              <button
                type="button"
                onClick={handleDoCurrentStep}
                className="cursor-pointer rounded-lg border border-sky-400/60 bg-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/35"
              >
                {isArabic ? 'نفّذ هذه الخطوة' : 'Do This Step'}
              </button>
            </div>
          </div>
        )
      )}
    </aside>
  );
});
