import { useEffect, useMemo, useState } from 'react';
import { LAB_CHALLENGES } from '../data/labChallenges';
import {
  formatTruthTableMarkdown,
  generateTruthTable,
  gradeChallenge,
  signalToCellSymbol,
  type ChallengeGradeResult,
} from '../engine/circuitAnalyzer';
import type { SignalLevel } from '../engine/gateEvaluators';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playSlideClick, playWirePlug, playWireUnplug } from '../utils/soundEffects';

const STORAGE_KEY = 'bcube_completed_challenges_v1';

function loadCompletedChallengeIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveCompletedChallengeIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

function SignalCellBadge({ signal }: { signal: SignalLevel }) {
  const label = signalToCellSymbol(signal);
  const cls =
    signal === 'HIGH'
      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
      : signal === 'LOW'
        ? 'border-slate-600/70 bg-slate-800/80 text-slate-300'
        : signal === 'CONFLICT'
          ? 'border-red-500/70 bg-red-500/25 text-red-200'
          : 'border-zinc-600/60 bg-zinc-800/70 text-zinc-400';

  return (
    <span
      className={`inline-flex min-w-7 items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

const DIFFICULTY_BADGES = {
  Beginner: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  Intermediate: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  Advanced: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
};

/**
 * Collapsible right-side student study drawer featuring:
 * 1) Live Auto Truth Table Analyzer (row highlight + click-to-test + Markdown export)
 * 2) Guided Lab Challenges with Auto-Grading & localStorage progress
 */
export function LabDrawer() {
  const activeDrawerTab = useSimulatorStore((s) => s.activeDrawerTab);
  const setActiveDrawerTab = useSimulatorStore((s) => s.setActiveDrawerTab);
  const wires = useSimulatorStore((s) => s.wires);
  const switches = useSimulatorStore((s) => s.switches);
  const buttons = useSimulatorStore((s) => s.buttons);
  const ttlFloatingIsHigh = useSimulatorStore((s) => s.ttlFloatingIsHigh);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);
  const applyInputVector = useSimulatorStore((s) => s.applyInputVector);
  const clearWires = useSimulatorStore((s) => s.clearWires);
  const resetInputs = useSimulatorStore((s) => s.resetInputs);
  const showToast = useSimulatorStore((s) => s.showToast);

  const [copiedMd, setCopiedMd] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState(LAB_CHALLENGES[0].id);
  const [showHint, setShowHint] = useState(false);
  const [gradeResult, setGradeResult] = useState<ChallengeGradeResult | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>(() => loadCompletedChallengeIds());

  const truthTable = useMemo(
    () => generateTruthTable(wires, { ttlFloatingIsHigh }),
    [wires, ttlFloatingIsHigh]
  );

  const selectedChallenge = useMemo(
    () => LAB_CHALLENGES.find((c) => c.id === selectedChallengeId) ?? LAB_CHALLENGES[0],
    [selectedChallengeId]
  );

  useEffect(() => {
    setGradeResult(null);
  }, [wires]);

  if (!activeDrawerTab) return null;

  const handleCopyMarkdown = async () => {
    const md = formatTruthTableMarkdown(truthTable);
    if (!md) return;
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      showToast('Truth table Markdown copied to clipboard!', 'success');
      window.setTimeout(() => setCopiedMd(false), 1800);
    } catch {
      showToast('Clipboard blocked — enable clipboard permissions to copy.', 'warning');
    }
  };

  const handleSelectChallenge = (id: string) => {
    setSelectedChallengeId(id);
    setShowHint(false);
    setGradeResult(null);
  };

  const handleStartClean = () => {
    clearWires();
    resetInputs();
    setGradeResult(null);
    if (soundEnabled) playWireUnplug();
    showToast(`Workspace cleared for ${selectedChallenge.title}`, 'info');
  };

  const handleCheckCircuit = () => {
    const res = gradeChallenge(selectedChallenge, wires, { ttlFloatingIsHigh });
    setGradeResult(res);
    if (res.passed) {
      if (soundEnabled) playWirePlug();
      if (!completedIds.includes(selectedChallenge.id)) {
        const next = [...completedIds, selectedChallenge.id];
        setCompletedIds(next);
        saveCompletedChallengeIds(next);
      }
      showToast(`Challenge Passed: ${selectedChallenge.title}!`, 'success');
    } else if (soundEnabled) {
      playWireUnplug();
    }
  };

  return (
    <aside
      aria-label="Lab Workbench Drawer"
      className="pointer-events-auto fixed top-14 right-3 bottom-16 z-30 flex w-[395px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/92 text-slate-100 shadow-2xl backdrop-blur-lg"
    >
      {/* Drawer Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-700/80 bg-slate-950/60 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-900/90 p-0.5">
          <button
            type="button"
            onClick={() => setActiveDrawerTab('truth-table')}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              activeDrawerTab === 'truth-table'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Truth Table
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawerTab('challenges')}
            className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              activeDrawerTab === 'challenges'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Lab Challenges ({completedIds.length}/{LAB_CHALLENGES.length})
          </button>
        </div>

        <button
          type="button"
          aria-label="Close drawer"
          onClick={() => setActiveDrawerTab(null)}
          className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {activeDrawerTab === 'truth-table' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Live Circuit Truth Table</h2>
                <p className="text-[11px] text-slate-400">
                  Click any row to apply those inputs directly to the 3D board.
                </p>
              </div>
              <button
                type="button"
                disabled={truthTable.rows.length === 0}
                onClick={handleCopyMarkdown}
                className="shrink-0 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-sky-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copiedMd ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>

            {truthTable.truncated && truthTable.truncatedNote && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                {truthTable.truncatedNote}
              </div>
            )}

            {truthTable.inputs.some((i) => i.activeLow) && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200">
                Note: Pushbuttons are <strong>Active-Low</strong> — column shows electrical pin
                logic (1 = released, 0 = pressed).
              </div>
            )}

            {truthTable.rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center text-xs text-slate-400">
                Wire at least one input (<code className="text-sky-300">SW1–SW16</code> /{' '}
                <code className="text-sky-300">BTN1–BTN4</code>) and one output LED (
                <code className="text-rose-300">RED_D1–D8</code> /{' '}
                <code className="text-sky-300">BLUE_D1–D8</code>) to auto-generate a truth table.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/60">
                <table className="w-full border-collapse text-center text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-900/90 text-[11px] font-semibold text-slate-300">
                      {truthTable.inputs.map((inp) => (
                        <th key={inp.id} className="px-2.5 py-2 text-sky-300">
                          {inp.label}
                        </th>
                      ))}
                      {truthTable.outputs.map((out) => (
                        <th
                          key={out.id}
                          className={`border-l border-slate-800 px-2.5 py-2 ${
                            out.bank === 'red' ? 'text-rose-300' : 'text-sky-300'
                          }`}
                        >
                          {out.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {truthTable.rows.map((row) => {
                      const isLiveRow = truthTable.inputs.every((inp) => {
                        const liveBit: 0 | 1 = inp.activeLow
                          ? buttons[inp.id]
                            ? 0
                            : 1
                          : switches[inp.id]
                            ? 1
                            : 0;
                        return liveBit === row.inputValues[inp.id];
                      });

                      return (
                        <tr
                          key={row.index}
                          onClick={() => {
                            applyInputVector(row.inputValues);
                            if (soundEnabled) playSlideClick(true);
                          }}
                          title="Click to test this input row on the 3D board"
                          className={`cursor-pointer border-b border-slate-800/70 transition-colors last:border-none ${
                            isLiveRow
                              ? 'bg-sky-500/20 font-semibold ring-1 ring-inset ring-sky-400/60'
                              : 'hover:bg-slate-800/70'
                          }`}
                        >
                          {truthTable.inputs.map((inp) => (
                            <td key={inp.id} className="px-2.5 py-1.5 font-mono text-slate-200">
                              {row.inputValues[inp.id]}
                            </td>
                          ))}
                          {truthTable.outputs.map((out) => (
                            <td key={out.id} className="border-l border-slate-800/70 px-2.5 py-1.5">
                              <SignalCellBadge signal={row.outputValues[out.id] ?? 'FLOATING'} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Challenge Selector List */}
            <div className="flex flex-col gap-1.5">
              {LAB_CHALLENGES.map((ch) => {
                const isSelected = ch.id === selectedChallenge.id;
                const isDone = completedIds.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChallenge(ch.id)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? 'border-sky-400/70 bg-sky-500/15'
                        : 'border-slate-700/70 bg-slate-950/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isDone && (
                          <span
                            aria-label="Completed"
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-[10px] font-bold text-emerald-300"
                          >
                            ✓
                          </span>
                        )}
                        <span className="truncate text-xs font-semibold text-white">
                          {ch.title}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_BADGES[ch.difficulty]}`}
                    >
                      {ch.difficulty}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Challenge Card */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3.5">
              <h3 className="text-sm font-semibold text-white">{selectedChallenge.title}</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                {selectedChallenge.objective}
              </p>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-sky-300">
                  In: {selectedChallenge.requiredInputs.join(', ')}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-rose-300">
                  Out: {selectedChallenge.requiredOutputs.join(', ')}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-amber-200">
                  ICs: {selectedChallenge.suggestedICs.join(', ')}
                </span>
              </div>

              {showHint && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-100">
                  <strong className="text-amber-300">Hint:</strong> {selectedChallenge.hint}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCheckCircuit}
                  className="flex-1 cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-emerald-500"
                >
                  Check My Circuit
                </button>
                <button
                  type="button"
                  onClick={handleStartClean}
                  className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
                >
                  Start Clean
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => !prev)}
                  className="cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
              </div>
            </div>

            {/* Auto-Grade Result */}
            {gradeResult && (
              <div
                role="status"
                className={`rounded-xl border p-3 text-xs ${
                  gradeResult.passed
                    ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-100'
                    : 'border-rose-500/60 bg-rose-950/70 text-rose-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">
                    {gradeResult.passed ? 'PASS — Verified!' : 'FAIL — Needs Wiring Fix'}
                  </span>
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-semibold">
                    {gradeResult.scoreText}
                  </span>
                </div>

                {!gradeResult.passed && (
                  <div className="mt-2 flex flex-col gap-1.5 text-[11px]">
                    {gradeResult.missingPins.length > 0 && (
                      <p className="text-amber-200">
                        Unwired required pins: <strong>{gradeResult.missingPins.join(', ')}</strong>
                      </p>
                    )}
                    {gradeResult.hasConflict && (
                      <p className="text-rose-200">
                        Bus contention conflict detected on one or more states.
                      </p>
                    )}
                    {gradeResult.failedCases.slice(0, 4).map((fc, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-rose-500/30 bg-black/25 px-2 py-1 font-mono"
                      >
                        In{' '}
                        {Object.entries(fc.inputs)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' ')}{' '}
                        → Expected{' '}
                        {Object.entries(fc.expected)
                          .map(([k, v]) => `${k}:${v}`)
                          .join(' ')}{' '}
                        | Got{' '}
                        {Object.entries(fc.actual)
                          .map(([k, v]) => `${k}:${signalToCellSymbol(v)}`)
                          .join(' ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
