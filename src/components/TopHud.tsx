import { useSimulatorStore } from '../store/useSimulatorStore';

/**
 * Minimal top-right HUD bar for switching 3D/2D camera view and resetting framing.
 */
export function TopHud() {
  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);
  const triggerCameraReset = useSimulatorStore((s) => s.triggerCameraReset);

  return (
    <header className="pointer-events-auto fixed top-4 right-4 z-20 flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3.5 py-2 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 pr-1">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
        <h1 className="text-xs font-semibold tracking-wide text-slate-100 sm:text-sm">
          bCube Digital Logic 3D Simulator (v1)
        </h1>
      </div>

      <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/70 p-0.5">
        <button
          type="button"
          onClick={() => setCameraMode('3d')}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            cameraMode === '3d'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          3D Free View
        </button>
        <button
          type="button"
          onClick={() => setCameraMode('2d')}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            cameraMode === '2d'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          2D Wiring View (V)
        </button>
      </div>

      <button
        type="button"
        onClick={triggerCameraReset}
        className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80 hover:text-white"
      >
        Reset Camera (R)
      </button>
    </header>
  );
}
