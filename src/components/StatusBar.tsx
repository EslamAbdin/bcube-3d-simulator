import type { SignalLevel } from '../engine/gateEvaluators';
import { MODULE_MAP, SOCKET_MAP } from '../schema/boardSchema';
import { useSimulatorStore } from '../store/useSimulatorStore';

const SIGNAL_BADGE_CLASSES: Record<SignalLevel, string> = {
  HIGH: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200',
  LOW: 'border-slate-500/60 bg-slate-700/70 text-slate-200',
  FLOATING: 'border-zinc-500/50 bg-zinc-700/60 text-zinc-300',
  CONFLICT: 'border-red-400/70 bg-red-500/25 text-red-200',
};

/**
 * Bottom-center live HUD status pill showing hovered active pin signals,
 * standby v2 badges, bus contention conflict banners, or quick usage hints.
 */
export function StatusBar() {
  const hoveredSocketId = useSimulatorStore((s) => s.hoveredSocketId);
  const hoveredStandbyModuleId = useSimulatorStore((s) => s.hoveredStandbyModuleId);
  const socketStates = useSimulatorStore((s) => s.socketStates);
  const conflicts = useSimulatorStore((s) => s.conflicts);

  const hoveredSocket = hoveredSocketId ? SOCKET_MAP[hoveredSocketId] : undefined;
  const hoveredStandby = hoveredStandbyModuleId ? MODULE_MAP[hoveredStandbyModuleId] : undefined;
  const hoveredSignal: SignalLevel = hoveredSocket
    ? (socketStates[hoveredSocket.id] ?? 'FLOATING')
    : 'FLOATING';

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-20 flex max-w-[92vw] -translate-x-1/2 flex-col items-center gap-2">
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

      <div className="flex items-center gap-2.5 rounded-full border border-slate-700/75 bg-slate-900/85 px-4 py-1.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
        {hoveredSocket ? (
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
        ) : hoveredStandby ? (
          <>
            <span className="font-medium text-slate-200">{hoveredStandby.label}</span>
            <span className="text-slate-500">•</span>
            <span className="rounded-full border border-slate-600/70 bg-slate-800/90 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              Standby (Coming in v2)
            </span>
          </>
        ) : (
          <span className="text-slate-400">
            Click switches to toggle • Shift+Click or Double-Click buttons to latch • Press V for
            2D View
          </span>
        )}
      </div>
    </div>
  );
}
