import { useEffect } from 'react';
import { SOCKET_MAP } from '../schema/boardSchema';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playWirePlug } from '../utils/soundEffects';

/**
 * Confirmation gate shown when a student attempts an illogical or hazardous
 * wire connection while ERC is enabled. Requires pressing "Ignore & Connect".
 */
export function WireWarningModal() {
  const pendingWireWarning = useSimulatorStore((s) => s.pendingWireWarning);
  const confirmPendingWireWarning = useSimulatorStore((s) => s.confirmPendingWireWarning);
  const dismissPendingWireWarning = useSimulatorStore((s) => s.dismissPendingWireWarning);

  useEffect(() => {
    if (!pendingWireWarning) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        dismissPendingWireWarning();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [pendingWireWarning, dismissPendingWireWarning]);

  if (!pendingWireWarning) return null;

  const fromLabel = SOCKET_MAP[pendingWireWarning.fromSocketId]?.tooltip ?? pendingWireWarning.fromSocketId;
  const toLabel = SOCKET_MAP[pendingWireWarning.toSocketId]?.tooltip ?? pendingWireWarning.toSocketId;
  const hasError = pendingWireWarning.diagnostics.some((d) => d.severity === 'error');

  const handleIgnoreAndConnect = () => {
    const soundEnabled = useSimulatorStore.getState().soundEnabled;
    const ok = confirmPendingWireWarning();
    if (ok && soundEnabled) {
      playWirePlug();
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bcube-wire-warning-title"
      onClick={dismissPendingWireWarning}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/85 bg-slate-900/95 p-4 text-slate-100 shadow-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                hasError ? 'animate-pulse bg-rose-400' : 'bg-amber-400'
              }`}
            />
            <h2 id="bcube-wire-warning-title" className="text-sm font-bold text-white sm:text-base">
              {hasError ? 'Wiring Error Warning' : 'Logic Connection Warning'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cancel connection"
            onClick={dismissPendingWireWarning}
            className="cursor-pointer rounded-lg px-2 py-0.5 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs">
          <span className="text-slate-400">Proposed wire: </span>
          <strong className="text-amber-200">{fromLabel}</strong>
          <span className="mx-1.5 text-slate-500">→</span>
          <strong className="text-sky-300">{toLabel}</strong>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {pendingWireWarning.diagnostics.map((diag) => {
            const isErr = diag.severity === 'error';
            return (
              <div
                key={diag.id}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  isErr
                    ? 'border-rose-500/45 bg-rose-950/45 text-rose-100'
                    : 'border-amber-500/45 bg-amber-950/35 text-amber-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      isErr ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {isErr ? 'Error' : 'Warn'}
                  </span>
                  <span>{diag.title}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{diag.message}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismissPendingWireWarning}
            className="cursor-pointer rounded-xl border border-slate-600/80 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleIgnoreAndConnect}
            className={`cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              hasError
                ? 'border-rose-400/70 bg-rose-500/25 text-rose-100 hover:bg-rose-500/40'
                : 'border-amber-400/70 bg-amber-500/25 text-amber-100 hover:bg-amber-500/40'
            }`}
          >
            Ignore &amp; Connect
          </button>
        </div>
      </div>
    </div>
  );
}
