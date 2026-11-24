import { memo, useEffect } from 'react';
import type { SignalLevel } from '../engine/gateEvaluators';
import { MODULE_MAP, SOCKET_MAP } from '../schema/boardSchema';
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
 * Bottom-center live HUD status bar: Bus contention warnings, transient toasts,
 * dismissible active preset guide chip, wiring prompts, and hovered pin signals.
 */
export const StatusBar = memo(function StatusBar() {
  const hoveredSocketId = useSimulatorStore((s) => s.hoveredSocketId);
  const hoveredStandbyModuleId = useSimulatorStore((s) => s.hoveredStandbyModuleId);
  const pendingSocketId = useSimulatorStore((s) => s.pendingSocketId);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const hoveredSignal = useSimulatorStore<SignalLevel>((s) =>
    s.hoveredSocketId ? (s.socketStates[s.hoveredSocketId] ?? 'FLOATING') : 'FLOATING'
  );
  const conflicts = useSimulatorStore((s) => s.conflicts);
  const activePresetInfo = useSimulatorStore((s) => s.activePresetInfo);
  const dismissPresetInfo = useSimulatorStore((s) => s.dismissPresetInfo);
  const statusToast = useSimulatorStore((s) => s.statusToast);
  const clearToast = useSimulatorStore((s) => s.clearToast);

  useEffect(() => {
    if (!statusToast) return;
    const timer = window.setTimeout(() => clearToast(), 2800);
    return () => window.clearTimeout(timer);
  }, [statusToast, clearToast]);

  const hoveredSocket = hoveredSocketId ? SOCKET_MAP[hoveredSocketId] : undefined;
  const hoveredStandby = hoveredStandbyModuleId ? MODULE_MAP[hoveredStandbyModuleId] : undefined;
  const originSocket = pendingSocketId ? SOCKET_MAP[pendingSocketId] : undefined;

  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 flex max-w-[94vw] -translate-x-1/2 flex-col items-center gap-1.5">
      {conflicts.length > 0 && (
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

      {activePresetInfo && !pendingSocketId && (
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-sky-500/40 bg-slate-900/85 px-3.5 py-1 text-xs text-slate-200 shadow-xl backdrop-blur-md">
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
                ' — Tap target hole'
              )}
            </span>
            <button
              type="button"
              onClick={() => useSimulatorStore.getState().cancelWiring()}
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
              {hoveredSignal}
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
              className="pointer-events-auto cursor-pointer rounded-full border border-rose-500/60 bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/35"
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
        ) : hoveredStandby ? (
          <>
            <span className="font-medium text-slate-200">{hoveredStandby.label}</span>
            <span className="text-slate-500">•</span>
            <span className="rounded-full border border-slate-600/70 bg-slate-800/90 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              Standby (Coming in v2)
            </span>
          </>
        ) : (
          <span className="text-center text-slate-400">
            <span className="hidden xl:inline">
              Click any header socket to wire • Right-Click wire to remove • Ctrl+Z undo • V for 2D
              View
            </span>
            <span className="xl:hidden">
              Tap sockets to wire • Tap wire to delete • 1-finger orbit / 2-finger pinch
            </span>
          </span>
        )}
      </div>
    </div>
  );
});
