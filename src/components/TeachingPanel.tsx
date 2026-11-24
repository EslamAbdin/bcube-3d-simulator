import { memo, useMemo, useState } from 'react';
import {
  TEACHING_COPY,
  TEACHING_LESSONS,
  buildLiveGateExplanations,
  type TeachingLesson,
} from '../data/teachingContent';
import type { SignalLevel } from '../engine/gateEvaluators';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playSlideClick } from '../utils/soundEffects';

function PinPill({
  label,
  level,
}: {
  label: string;
  level: SignalLevel;
}) {
  const tone =
    level === 'HIGH'
      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
      : level === 'LOW'
        ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
        : level === 'CONFLICT'
          ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
          : 'border-slate-600/70 bg-slate-800/80 text-slate-400';

  const bit = level === 'HIGH' ? '1' : level === 'LOW' ? '0' : level === 'CONFLICT' ? '!' : '—';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}
    >
      <span>{label}</span>
      <span dir="ltr" className="rounded bg-black/30 px-1 font-mono font-bold">
        {bit}
      </span>
    </span>
  );
}

/**
 * Floating Bilingual Teaching Mode card (Simple Arabic RTL & English LTR).
 * Explains live electricity flow vs cut-off across wired gates and provides 1-click demos.
 */
export const TeachingPanel = memo(function TeachingPanel() {
  const teachingMode = useSimulatorStore((s) => s.teachingMode);
  const lang = useSimulatorStore((s) => s.teachingLang);
  const setTeachingLang = useSimulatorStore((s) => s.setTeachingLang);
  const setTeachingMode = useSimulatorStore((s) => s.setTeachingMode);
  const wires = useSimulatorStore((s) => s.wires);
  const socketStates = useSimulatorStore((s) => s.socketStates);
  const activePresetInfo = useSimulatorStore((s) => s.activePresetInfo);
  const loadTeachingDemo = useSimulatorStore((s) => s.loadTeachingDemo);
  const showToast = useSimulatorStore((s) => s.showToast);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);

  const [collapsed, setCollapsed] = useState(false);

  const copy = TEACHING_COPY[lang];

  const liveGates = useMemo(
    () => (teachingMode ? buildLiveGateExplanations(wires, socketStates, lang) : []),
    [teachingMode, wires, socketStates, lang]
  );

  if (!teachingMode) return null;

  const handleLoadLesson = (lesson: TeachingLesson) => {
    loadTeachingDemo(lesson.wires, lesson.initialSwitches, {
      id: lesson.id,
      name: lesson.title[lang],
      description: lesson.summary[lang],
      controlsHint: lesson.controlsHint[lang],
    });
    showToast(
      lang === 'ar' ? `تم تحميل درس: ${lesson.title.ar}` : `Loaded lesson: ${lesson.title.en}`,
      'success'
    );
    if (soundEnabled) {
      playSlideClick(true);
    }
  };

  return (
    <aside
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      aria-label={copy.panelTitle}
      className="fixed top-12 left-2 right-2 z-20 flex flex-col overflow-hidden rounded-2xl border border-emerald-500/45 bg-slate-900/94 text-slate-100 shadow-2xl backdrop-blur-lg sm:right-auto sm:w-[348px] lg:top-14 lg:left-3 lg:max-h-[calc(100vh-116px)]"
    >
      {/* Header + EN / عربي Toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 bg-slate-950/75 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          <h2 className="text-xs font-bold tracking-wide text-emerald-200">{copy.panelTitle}</h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTeachingLang(lang === 'en' ? 'ar' : 'en')}
            className="cursor-pointer rounded-lg border border-sky-400/60 bg-sky-500/20 px-2 py-0.5 text-[11px] font-bold text-sky-200 transition-colors hover:bg-sky-500/35"
          >
            {copy.switchLangLabel}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 lg:hidden"
          >
            {collapsed ? copy.expand : copy.collapse}
          </button>

          <button
            type="button"
            aria-label={copy.close}
            onClick={() => setTeachingMode(false)}
            className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      <div
        className={`${
          collapsed ? 'hidden lg:flex' : 'flex'
        } max-h-[29vh] flex-col gap-2.5 overflow-y-auto p-2.5 sm:p-3 lg:max-h-none`}
      >
        {/* Electricity Color Key */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-2 text-[11px]">
          <div className="mb-1.5 font-semibold text-slate-300">{copy.legendTitle}</div>
          <div className="grid grid-cols-1 gap-1 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-200">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-400 shadow-[0_0_6px_rgba(74,222,128,0.9)]" />
              <span>{copy.legendHigh}</span>
            </div>
            <div className="flex items-center gap-2 text-rose-200">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-rose-600" />
              <span>{copy.legendLow}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-slate-600 bg-slate-800" />
              <span>{copy.legendFloating}</span>
            </div>
          </div>
        </div>

        {/* Live Gate Explanations */}
        <div>
          <div className="mb-1.5 text-[11px] font-bold text-slate-300">{copy.liveTitle}</div>
          {liveGates.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-2.5 text-[11px] leading-relaxed text-slate-300">
              {copy.emptyLiveHint}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {liveGates.map((gate) => {
                const statusClass =
                  gate.status === 'flowing'
                    ? 'border-emerald-500/45 bg-emerald-950/35'
                    : gate.status === 'cutoff'
                      ? 'border-rose-500/40 bg-rose-950/30'
                      : gate.status === 'conflict'
                        ? 'border-amber-500/60 bg-amber-950/45'
                        : 'border-slate-700/70 bg-slate-950/50';
                const badgeText =
                  gate.status === 'flowing'
                    ? copy.flowingBadge
                    : gate.status === 'cutoff'
                      ? copy.cutoffBadge
                      : gate.status === 'conflict'
                        ? copy.conflictBadge
                        : copy.floatingBadge;
                const badgeTone =
                  gate.status === 'flowing'
                    ? 'bg-emerald-500/25 text-emerald-200'
                    : gate.status === 'cutoff'
                      ? 'bg-rose-500/25 text-rose-200'
                      : gate.status === 'conflict'
                        ? 'bg-amber-500/25 text-amber-200'
                        : 'bg-slate-700/60 text-slate-300';

                return (
                  <div key={gate.key} className={`rounded-xl border p-2 ${statusClass}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span dir="ltr" className="text-[11px] font-bold text-slate-100">
                        {gate.title}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeTone}`}>
                        {badgeText}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {gate.inputs.map((inp) => (
                        <PinPill
                          key={inp.pinNumber}
                          label={`${copy.pinPrefix} ${inp.pinNumber}`}
                          level={inp.level}
                        />
                      ))}
                      <span className="text-[11px] font-bold text-slate-400">
                        {lang === 'ar' ? '←' : '→'}
                      </span>
                      <PinPill
                        label={`${copy.outputLabel} ${gate.output.pinNumber}`}
                        level={gate.output.level}
                      />
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200">{gate.reason}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 1-Click Guided Lessons */}
        <div>
          <div className="mb-1.5 text-[11px] font-bold text-slate-300">{copy.lessonsTitle}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {TEACHING_LESSONS.map((lesson) => {
              const isActive = activePresetInfo?.id === lesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => handleLoadLesson(lesson)}
                  className={`cursor-pointer rounded-xl border px-2 py-1.5 text-start transition-colors ${
                    isActive
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700/80 bg-slate-800/75 text-slate-200 hover:border-sky-400/60 hover:bg-slate-800'
                  }`}
                >
                  <div dir="ltr" className="text-[10px] font-bold text-sky-300">
                    {lesson.chipTag}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-semibold">
                    {lesson.title[lang]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
});
