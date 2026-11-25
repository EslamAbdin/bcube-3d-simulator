import { memo, useEffect, useState } from 'react';
import { IC_DATASHEETS } from '../data/icDatasheets';
import { describeSignalForTeaching } from '../data/teachingContent';
import type { SignalLevel } from '../engine/gateEvaluators';
import { SOCKET_MAP } from '../schema/boardSchema';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playWireUnplug } from '../utils/soundEffects';

const SIGNAL_BADGE_CLASSES: Record<SignalLevel, string> = {
  HIGH: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
  LOW: 'border-slate-500/60 bg-slate-700/70 text-slate-200',
  FLOATING: 'border-zinc-500/50 bg-zinc-700/60 text-zinc-300',
  CONFLICT: 'border-red-400/70 bg-red-500/25 text-red-200',
};

const TOAST_CLASSES = {
  info: 'border-sky-400/50 bg-sky-950/90 text-sky-100',
  warning: 'border-amber-400/60 bg-amber-950/90 text-amber-100',
  success: 'border-emerald-400/50 bg-emerald-950/90 text-emerald-100',
};

/**
 * Bottom-center live HUD status bar: Collapsible ERC wiring diagnostics,
 * bus contention warnings, transient toasts, active preset guide chip,
 * touch/mouse wiring prompts, and hovered pin signals.
 */
export const StatusBar = memo(function StatusBar() {
  const [ercExpanded, setErcExpanded] = useState(false);

  const hoveredSocketId = useSimulatorStore((s) => s.hoveredSocketId);
  const hoveredIcType = useSimulatorStore((s) => s.hoveredIcType);
  const pendingSocketId = useSimulatorStore((s) => s.pendingSocketId);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const teachingMode = useSimulatorStore((s) => s.teachingMode);
  const teachingLang = useSimulatorStore((s) => s.teachingLang);
  const hoveredSignal = useSimulatorStore<SignalLevel>((s) =>
    s.hoveredSocketId ? (s.socketStates[s.hoveredSocketId] ?? 'FLOATING') : 'FLOATING'
  );
  const conflicts = useSimulatorStore((s) => s.conflicts);
  const errorWarningsEnabled = useSimulatorStore((s) => s.errorWarningsEnabled);
  const wiringDiagnostics = useSimulatorStore((s) => s.wiringDiagnostics);
  const highlightedDiagnosticId = useSimulatorStore((s) => s.highlightedDiagnosticId);
  const setHighlightedDiagnosticId = useSimulatorStore((s) => s.setHighlightedDiagnosticId);

  const activePresetInfo = useSimulatorStore((s) => s.activePresetInfo);
  const dismissPresetInfo = useSimulatorStore((s) => s.dismissPresetInfo);
  const statusToast = useSimulatorStore((s) => s.statusToast);
  const clearToast = useSimulatorStore((s) => s.clearToast);

  useEffect(() => {
    if (!statusToast) return;
    const timer = window.setTimeout(() => clearToast(), 2800);
    return () => window.clearTimeout(timer);
  }, [statusToast, clearToast]);

  useEffect(() => {
    if (!errorWarningsEnabled || wiringDiagnostics.length === 0) {
      setErcExpanded(false);
    }
  }, [errorWarningsEnabled, wiringDiagnostics.length]);

  const hoveredSocket = hoveredSocketId ? SOCKET_MAP[hoveredSocketId] : undefined;
  const originSocket = pendingSocketId ? SOCKET_MAP[pendingSocketId] : undefined;

  const ercErrors = wiringDiagnostics.filter((d) => d.severity === 'error').length;
  const ercWarnings = wiringDiagnostics.length - ercErrors;
  const showErcBanner = errorWarningsEnabled && wiringDiagnostics.length > 0;

  return (
    <div className="pointer-events-none fixed bottom-2.5 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 flex-col items-center gap-1.5 sm:bottom-3">
      {showErcBanner && (
        <div className="pointer-events-auto flex w-full max-w-xl flex-col items-center gap-1.5">
          {ercExpanded && (
            <div
              role="region"
              aria-label="ERC Wiring Diagnostics List"
              className="flex max-h-44 w-full flex-col gap-1 overflow-y-auto rounded-2xl border border-slate-700/85 bg-slate-900/95 p-2 text-xs text-slate-100 shadow-2xl backdrop-blur-lg"
            >
              {wiringDiagnostics.map((diag) => {
                const isErr = diag.severity === 'error';
                const active = highlightedDiagnosticId === diag.id;
                return (
                  <button
                    key={diag.id}
                    type="button"
                    onClick={() => setHighlightedDiagnosticId(active ? null : diag.id)}
                    className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                      active
                        ? isErr
                          ? 'border-rose-400 bg-rose-500/25'
                          : 'border-amber-400 bg-amber-500/25'
                        : isErr
                          ? 'border-rose-500/40 bg-rose-950/45 hover:border-rose-400/70'
                          : 'border-amber-500/35 bg-amber-950/35 hover:border-amber-400/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold text-white">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            isErr
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          {isErr ? 'Error' : 'Warn'}
                        </span>
                        <span>{diag.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {active ? 'Highlighted' : 'Tap to highlight'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-300">{diag.message}</p>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setErcExpanded((v) => !v)}
            aria-expanded={ercExpanded}
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1 text-[11px] font-semibold shadow-2xl backdrop-blur-md transition-colors sm:text-xs ${
              ercErrors > 0
                ? 'border-rose-500/75 bg-rose-950/90 text-rose-100 hover:bg-rose-900/90'
                : 'border-amber-500/70 bg-amber-950/90 text-amber-100 hover:bg-amber-900/90'
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                ercErrors > 0 ? 'animate-pulse bg-rose-400' : 'bg-amber-400'
              }`}
            />
            <span>
              ERC:
              {ercErrors > 0 ? ` ${ercErrors} ${ercErrors === 1 ? 'Error' : 'Errors'}` : ''}
              {ercErrors > 0 && ercWarnings > 0 ? ',' : ''}
              {ercWarnings > 0
                ? ` ${ercWarnings} ${ercWarnings === 1 ? 'Warning' : 'Warnings'}`
                : ''}
            </span>
            <span className="text-[10px] opacity-80">{ercExpanded ? '▾ Hide' : '▴ Details'}</span>
          </button>
        </div>
      )}

      {conflicts.length > 0 && !showErcBanner && (
        <div
          role="alert"
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-red-500/70 bg-red-950/90 px-4 py-1.5 text-xs font-medium text-red-100 shadow-2xl backdrop-blur-md"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
          <span>
            Bus Contention Detected ({conflicts.length} conflicted{' '}
            {conflicts.length === 1 ? 'net' : 'nets'}):{' '}
            {conflicts
              .map((c) => c.drivers.map((d) => `${d.label}=${d.level}`).join(' vs '))
              .join(' | ')}
          </span>
        </div>
      )}

      {statusToast && (
        <div
          role="status"
          className={`rounded-full border px-3.5 py-1 text-xs font-medium shadow-xl backdrop-blur-md ${TOAST_CLASSES[statusToast.kind]}`}
        >
          {statusToast.message}
        </div>
      )}

      {activePresetInfo && !pendingSocketId && !teachingMode && (
        <div className="pointer-events-auto hidden items-center gap-2.5 rounded-full border border-sky-500/40 bg-slate-900/85 px-3.5 py-1 text-xs text-slate-200 shadow-xl backdrop-blur-md sm:flex">
          <span className="font-semibold text-sky-300">{activePresetInfo.name}:</span>
          <span className="text-slate-300">{activePresetInfo.controlsHint}</span>
          <button
            type="button"
            aria-label="Dismiss preset guide"
            onClick={dismissPresetInfo}
            className="cursor-pointer rounded-full px-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-slate-700/75 bg-slate-900/88 px-3 py-1.5 text-[11px] text-slate-200 shadow-2xl backdrop-blur-md sm:gap-2 sm:rounded-full sm:px-4 sm:text-xs">
        {originSocket ? (
          <>
            <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
            <span>
              Wiring from <strong className="text-amber-200">{originSocket.tooltip}</strong>
              {hoveredSocket && hoveredSocket.id !== originSocket.id ? (
                <>
                  {' '}
                  → <strong className="text-sky-300">{hoveredSocket.tooltip}</strong>
                </>
              ) : (
                ' — Drag/tap target hole'
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                const st = useSimulatorStore.getState();
                st.cancelWiring();
                st.setHoveredSocketId(null);
              }}
              className="pointer-events-auto cursor-pointer rounded-full border border-slate-600/80 bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-700"
            >
              Cancel
            </button>
          </>
        ) : hoveredSocket ? (
          <>
            <span className="font-semibold text-sky-200">{hoveredSocket.tooltip}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Signal:</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${SIGNAL_BADGE_CLASSES[hoveredSignal]}`}
            >
              {teachingMode ? describeSignalForTeaching(hoveredSignal, teachingLang) : hoveredSignal}
            </span>
          </>
        ) : selectedWireId ? (
          <>
            <span className="text-sky-200">Wire selected</span>
            <button
              type="button"
              onClick={() => {
                const st = useSimulatorStore.getState();
                st.removeWire(selectedWireId);
                if (st.soundEnabled) playWireUnplug();
              }}
              className="pointer-events-auto cursor-pointer rounded-full border border-rose-500/60 bg-rose-500/20 px-3 py-0.5 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/35"
            >
              Delete Wire
            </button>
            <button
              type="button"
              onClick={() => useSimulatorStore.getState().selectWire(null)}
              className="pointer-events-auto cursor-pointer rounded-full border border-slate-600/80 bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Deselect
            </button>
          </>
        ) : hoveredIcType ? (
          <>
            <span className="font-semibold text-sky-200">
              {IC_DATASHEETS[hoveredIcType].partNumber} ({IC_DATASHEETS[hoveredIcType].chipShort}{' '}
              {IC_DATASHEETS[hoveredIcType].gateName})
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              {teachingMode && teachingLang === 'ar'
                ? 'اضغط على الشريحة لعرض التوصيل الداخلي والمعادلة'
                : 'Click IC chip to view internal pinout, live wiring & equation'}
            </span>
          </>
        ) : (
          <span className="text-center text-slate-400">
            <span className="hidden xl:inline">
              Click any header socket to wire • Right-Click wire to remove • Ctrl+Z undo • V for 2D
              View
            </span>
            <span className="xl:hidden">
              1-finger tap/drag to wire • Tap wire to delete • 2-finger move/zoom
            </span>
          </span>
        )}
      </div>
    </div>
  );
});
