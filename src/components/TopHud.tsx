import { useRef, useState, type ChangeEvent } from 'react';
import { PRESET_CIRCUITS } from '../data/presetCircuits';
import { useSimulatorStore, WIRE_COLORS } from '../store/useSimulatorStore';
import { playSlideClick, playWireUnplug } from '../utils/soundEffects';

/**
 * Compact dark-glass top HUD bar: Lab Presets, JSON Export/Import & Share Link,
 * Wire Color Palette / Undo / Clear, View Switcher, Camera/Input Reset, TTL & Sound.
 */
export function TopHud() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const wires = useSimulatorStore((s) => s.wires);
  const activeWireColor = useSimulatorStore((s) => s.activeWireColor);
  const autoCycleWireColor = useSimulatorStore((s) => s.autoCycleWireColor);
  const setActiveWireColor = useSimulatorStore((s) => s.setActiveWireColor);
  const toggleAutoCycleWireColor = useSimulatorStore((s) => s.toggleAutoCycleWireColor);
  const undoLastWire = useSimulatorStore((s) => s.undoLastWire);
  const clearWires = useSimulatorStore((s) => s.clearWires);
  const activePresetInfo = useSimulatorStore((s) => s.activePresetInfo);
  const loadPreset = useSimulatorStore((s) => s.loadPreset);
  const exportCircuitJSON = useSimulatorStore((s) => s.exportCircuitJSON);
  const importCircuitJSON = useSimulatorStore((s) => s.importCircuitJSON);
  const encodeCircuitToHash = useSimulatorStore((s) => s.encodeCircuitToHash);
  const showToast = useSimulatorStore((s) => s.showToast);

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
    if (soundEnabled) playSlideClick(false);
  };

  const handleUndo = () => {
    const undone = undoLastWire();
    if (undone && soundEnabled) playWireUnplug();
  };

  const handleClearWires = () => {
    if (wires.length === 0) return;
    clearWires();
    if (soundEnabled) playWireUnplug();
  };

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    loadPreset(id);
    if (soundEnabled) playSlideClick(true);
  };

  const handleExportJSON = () => {
    const json = exportCircuitJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bcube-circuit.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported bcube-circuit.json', 'success');
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const res = importCircuitJSON(text);
      if (res.ok) {
        showToast(`Loaded circuit from ${file.name}`, 'success');
      } else {
        showToast(res.error ?? 'Could not import circuit JSON.', 'warning');
      }
    } catch {
      showToast('Failed to read selected JSON file.', 'warning');
    }
  };

  const handleShareLink = async () => {
    const hash = encodeCircuitToHash();
    const shareUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, '', hash);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast('Shareable circuit URL copied to clipboard!', 'success');
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('URL hash updated — copy the address bar link to share.', 'info');
    }
  };

  const pillClass =
    'flex flex-wrap items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/85 px-2 py-1 text-slate-100 shadow-2xl backdrop-blur-md pointer-events-auto';

  return (
    <header className="pointer-events-none fixed top-2.5 right-3 left-3 z-20 flex flex-wrap items-center justify-between gap-1.5">
      {/* Left: Brand, Lab Presets & Save/Load/Share */}
      <div className={pillClass}>
        <div className="flex items-center gap-1.5 pr-0.5">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
          <h1 className="text-[11px] font-semibold tracking-wide text-slate-100">
            bCube 3D
          </h1>
        </div>

        <select
          aria-label="Load lab preset"
          value={activePresetInfo?.id ?? ''}
          onChange={handlePresetChange}
          className="max-w-[168px] cursor-pointer truncate rounded-lg border border-slate-700/80 bg-slate-950/90 px-1.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
        >
          <option value="" disabled>
            Lab Presets…
          </option>
          <option value="empty">Empty Board</option>
          {PRESET_CIRCUITS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="h-4 w-px bg-slate-700/80" />

        <button
          type="button"
          onClick={handleExportJSON}
          title="Download current circuit as bcube-circuit.json"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
        >
          Export
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Load circuit from a JSON file"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        <button
          type="button"
          onClick={handleShareLink}
          title="Copy shareable URL containing the full circuit"
          className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
            copiedLink
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
              : 'border-sky-500/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
          }`}
        >
          {copiedLink ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Center: Jumper Wire Palette, Undo & Clear */}
      <div className={pillClass}>
        <div className="flex items-center gap-1" role="group" aria-label="Wire color palette">
          {WIRE_COLORS.map((c) => {
            const active = activeWireColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.name}
                type="button"
                aria-label={`Wire color ${c.name}`}
                title={`${c.name} wire`}
                onClick={() => setActiveWireColor(c.hex)}
                className={`h-3.5 w-3.5 cursor-pointer rounded-full border transition-transform ${
                  active
                    ? 'scale-115 border-white ring-2 ring-sky-400'
                    : 'border-slate-500/80 hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleAutoCycleWireColor}
          title="Automatically cycle wire colors after each connection"
          className={`cursor-pointer rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
            autoCycleWireColor
              ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          Auto
        </button>

        <span className="rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
          {wires.length} {wires.length === 1 ? 'wire' : 'wires'}
        </span>

        <button
          type="button"
          disabled={wires.length === 0}
          onClick={handleUndo}
          title="Undo last wire (Ctrl+Z)"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          disabled={wires.length === 0}
          onClick={handleClearWires}
          title="Remove all jumper wires"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-rose-200 transition-colors hover:border-rose-400/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear Wires
        </button>
      </div>

      {/* Right: Camera Mode, Resets, TTL & Sound */}
      <div className={pillClass}>
        <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/70 p-0.5">
          <button
            type="button"
            onClick={() => setCameraMode('3d')}
            className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
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
            className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
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
          title="Reset Camera (R)"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
        >
          Reset (R)
        </button>

        <button
          type="button"
          onClick={handleResetInputs}
          title="Reset all slide switches to OFF and unlatch all pushbuttons"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
        >
          Reset Inputs
        </button>

        <button
          type="button"
          onClick={() => setTtlFloatingIsHigh(!ttlFloatingIsHigh)}
          title="Beginner mode (OFF): unconnected gate inputs remain FLOATING. Real TTL mode (HIGH): unconnected 74xx inputs float HIGH (+5V)."
          className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
            ttlFloatingIsHigh
              ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          TTL: {ttlFloatingIsHigh ? 'HIGH' : 'OFF'}
        </button>

        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          title={soundEnabled ? 'Sound On (click to mute)' : 'Sound Off (click to enable)'}
          className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
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
          <span>{soundEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>
    </header>
  );
}
