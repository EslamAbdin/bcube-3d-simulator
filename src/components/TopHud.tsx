import { useSimulatorStore } from '../store/useSimulatorStore';
import { playSlideClick } from '../utils/soundEffects';

/**
 * Top-right dark-glass HUD bar: view switcher, camera reset, input reset,
 * beginner vs TTL floating-HIGH toggle, and procedural sound toggle.
 */
export function TopHud() {
  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);
  const triggerCameraReset = useSimulatorStore((s) => s.triggerCameraReset);
  const resetInputs = useSimulatorStore((s) => s.resetInputs);
  const ttlFloatingIsHigh = useSimulatorStore((s) => s.ttlFloatingIsHigh);
  const setTtlFloatingIsHigh = useSimulatorStore((s) => s.setTtlFloatingIsHigh);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);
  const toggleSound = useSimulatorStore((s) => s.toggleSound);

  const handleResetInputs = () => {
    resetInputs();
    if (soundEnabled) {
      playSlideClick(false);
    }
  };

  return (
    <header className="pointer-events-auto fixed top-4 right-4 z-20 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/85 px-3.5 py-2 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 pr-1">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
        <h1 className="text-xs font-semibold tracking-wide text-slate-100 sm:text-sm">
          bCube Digital Logic 3D Simulator (v1)
        </h1>
      </div>

      {/* Camera View Mode Toggle */}
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

      <span className="hidden h-4 w-px bg-slate-700/80 sm:inline-block" />

      <button
        type="button"
        onClick={handleResetInputs}
        title="Reset all slide switches to OFF and unlatch all pushbuttons"
        className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80 hover:text-white"
      >
        Reset Inputs
      </button>

      <button
        type="button"
        onClick={() => setTtlFloatingIsHigh(!ttlFloatingIsHigh)}
        title="Beginner mode (OFF): unconnected gate inputs remain FLOATING. Real TTL mode (HIGH): unconnected 74xx inputs float HIGH (+5V)."
        className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          ttlFloatingIsHigh
            ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
            : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
        }`}
      >
        TTL Float: {ttlFloatingIsHigh ? 'HIGH' : 'OFF'}
      </button>

      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
        title={soundEnabled ? 'Sound On (click to mute)' : 'Sound Off (click to enable)'}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          soundEnabled
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
            : 'border-slate-700/80 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-slate-200'
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          {soundEnabled ? (
            <>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          ) : (
            <>
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          )}
        </svg>
        <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
      </button>
    </header>
  );
}
