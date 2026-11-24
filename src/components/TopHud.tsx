import { memo, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { PRESET_CIRCUITS } from '../data/presetCircuits';
import { useSimulatorStore, WIRE_COLORS } from '../store/useSimulatorStore';
import { playSlideClick, playWireUnplug } from '../utils/soundEffects';

/**
 * Responsive single-row dark-glass Top HUD bar (designed for >= 1366px laptops):
 * Presets + File/Share menu, Wire Palette + X-Ray, Study Drawer tabs, Camera, TTL, Sound, Perf, Help.
 */
export const TopHud = memo(function TopHud() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const wireCount = useSimulatorStore((s) => s.wires.length);
  const activeWireColor = useSimulatorStore((s) => s.activeWireColor);
  const autoCycleWireColor = useSimulatorStore((s) => s.autoCycleWireColor);
  const setActiveWireColor = useSimulatorStore((s) => s.setActiveWireColor);
  const toggleAutoCycleWireColor = useSimulatorStore((s) => s.toggleAutoCycleWireColor);
  const signalFlowEnabled = useSimulatorStore((s) => s.signalFlowEnabled);
  const toggleSignalFlow = useSimulatorStore((s) => s.toggleSignalFlow);
  const undoLastWire = useSimulatorStore((s) => s.undoLastWire);
  const clearWires = useSimulatorStore((s) => s.clearWires);
  const activePresetInfo = useSimulatorStore((s) => s.activePresetInfo);
  const loadPreset = useSimulatorStore((s) => s.loadPreset);
  const exportCircuitJSON = useSimulatorStore((s) => s.exportCircuitJSON);
  const importCircuitJSON = useSimulatorStore((s) => s.importCircuitJSON);
  const encodeCircuitToHash = useSimulatorStore((s) => s.encodeCircuitToHash);
  const showToast = useSimulatorStore((s) => s.showToast);

  const activeDrawerTab = useSimulatorStore((s) => s.activeDrawerTab);
  const toggleDrawerTab = useSimulatorStore((s) => s.toggleDrawerTab);
  const setHelpModalOpen = useSimulatorStore((s) => s.setHelpModalOpen);

  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);
  const triggerCameraReset = useSimulatorStore((s) => s.triggerCameraReset);
  const resetInputs = useSimulatorStore((s) => s.resetInputs);
  const ttlFloatingIsHigh = useSimulatorStore((s) => s.ttlFloatingIsHigh);
  const setTtlFloatingIsHigh = useSimulatorStore((s) => s.setTtlFloatingIsHigh);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);
  const toggleSound = useSimulatorStore((s) => s.toggleSound);
  const performanceMode = useSimulatorStore((s) => s.performanceMode);
  const togglePerformanceMode = useSimulatorStore((s) => s.togglePerformanceMode);

  useEffect(() => {
    if (!fileMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFileMenuOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fileMenuOpen]);

  const handleResetInputs = () => {
    resetInputs();
    setFileMenuOpen(false);
    if (soundEnabled) playSlideClick(false);
  };

  const handleUndo = () => {
    const undone = undoLastWire();
    if (undone && soundEnabled) playWireUnplug();
  };

  const handleClearWires = () => {
    if (wireCount === 0) return;
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
    setFileMenuOpen(false);
    showToast('Exported bcube-circuit.json', 'success');
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setFileMenuOpen(false);
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
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      showToast('URL hash updated — copy the address bar link to share.', 'info');
    }
    setFileMenuOpen(false);
  };

  const pillClass =
    'pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-700/75 bg-slate-900/88 px-2 py-1 text-slate-100 shadow-2xl backdrop-blur-md';

  return (
    <header className="pointer-events-none fixed top-2.5 right-3 left-3 z-20 flex flex-wrap items-center justify-between gap-1.5">
      {/* Left: Brand, Lab Presets & File/Share Popover */}
      <div className={pillClass}>
        <div className="flex items-center gap-1.5 pr-0.5">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
          <h1 className="whitespace-nowrap text-[11px] font-semibold tracking-wide text-slate-100">
            bCube 3D
          </h1>
        </div>

        <select
          aria-label="Load lab preset"
          value={activePresetInfo?.id ?? ''}
          onChange={handlePresetChange}
          className="max-w-[144px] cursor-pointer truncate rounded-lg border border-slate-700/80 bg-slate-950/90 px-1.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
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

        <div className="relative" ref={fileMenuRef}>
          <button
            type="button"
            onClick={() => setFileMenuOpen((v) => !v)}
            aria-expanded={fileMenuOpen}
            className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-800/85 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
          >
            {copiedLink ? 'Copied!' : 'File ▾'}
          </button>

          {fileMenuOpen && (
            <div className="absolute top-full left-0 z-30 mt-1.5 flex w-44 flex-col gap-1 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-lg">
              <button
                type="button"
                onClick={handleExportJSON}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                Import JSON…
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-sky-300 transition-colors hover:bg-slate-800"
              >
                Copy Share Link
              </button>
              <span className="my-0.5 h-px bg-slate-800" />
              <button
                type="button"
                onClick={handleResetInputs}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-amber-200 transition-colors hover:bg-slate-800"
              >
                Reset Switches &amp; Buttons
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* Center: Wire Palette, X-Ray Signal Flow, Undo & Clear */}
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
                className={`h-3.5 w-3.5 cursor-pointer rounded-full border transition-transform ${active
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
          title="Auto-cycle wire color"
          className={`cursor-pointer rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${autoCycleWireColor
            ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
            : 'border-slate-700/80 bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
        >
          Auto
        </button>

        <button
          type="button"
          onClick={toggleSignalFlow}
          aria-pressed={signalFlowEnabled}
          title="X-Ray Signal Flow: highlight HIGH (1) wires in glowing green and dim LOW (0) wires"
          className={`cursor-pointer whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
            signalFlowEnabled
              ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          X-Ray
        </button>

        <span className="whitespace-nowrap rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
          {wireCount} {wireCount === 1 ? 'wire' : 'wires'}
        </span>

        <button
          type="button"
          disabled={wireCount === 0}
          onClick={handleUndo}
          title="Undo last wire (Ctrl+Z)"
          className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          disabled={wireCount === 0}
          onClick={handleClearWires}
          title="Remove all jumper wires"
          className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-rose-200 transition-colors hover:border-rose-400/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {/* Right: Study Workbench Tabs, Camera Mode, TTL, Perf, Sound & Help */}
      <div className={pillClass}>
        <button
          type="button"
          onClick={() => toggleDrawerTab('truth-table')}
          aria-pressed={activeDrawerTab === 'truth-table'}
          className={`cursor-pointer whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
            activeDrawerTab === 'truth-table'
              ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-slate-500'
          }`}
        >
          Truth Table
        </button>

        <button
          type="button"
          onClick={() => toggleDrawerTab('challenges')}
          aria-pressed={activeDrawerTab === 'challenges'}
          className={`cursor-pointer whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
            activeDrawerTab === 'challenges'
              ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-slate-500'
          }`}
        >
          Challenges
        </button>

        <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/70 p-0.5">
          <button
            type="button"
            onClick={() => setCameraMode('3d')}
            className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              cameraMode === '3d'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            3D View
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('2d')}
            className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
              cameraMode === '2d'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            2D View (V)
          </button>
        </div>

        <button
          type="button"
          onClick={triggerCameraReset}
          title="Reset Camera (R)"
          className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
        >
          Reset (R)
        </button>

        <button
          type="button"
          onClick={() => setTtlFloatingIsHigh(!ttlFloatingIsHigh)}
          title="Beginner mode (OFF): unconnected gate inputs stay FLOATING. Real TTL (HIGH): unconnected inputs float +5V."
          className={`cursor-pointer whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
            ttlFloatingIsHigh
              ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          TTL: {ttlFloatingIsHigh ? 'HIGH' : 'OFF'}
        </button>

        <button
          type="button"
          onClick={togglePerformanceMode}
          aria-pressed={performanceMode === 'eco'}
          title={
            performanceMode === 'high'
              ? 'Graphics: High Quality (DPR 1.5 + soft shadows). Click for Eco / Laptop 60 FPS mode.'
              : 'Graphics: Eco / Laptop Mode (DPR 1, shadows off for 60 FPS). Click for High Quality.'
          }
          className={`cursor-pointer whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
            performanceMode === 'eco'
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          {performanceMode === 'high' ? 'HQ' : 'Eco'}
        </button>

        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          title={soundEnabled ? 'Sound On (click to mute)' : 'Sound Off (click to enable)'}
          className={`flex cursor-pointer items-center justify-center rounded-lg border p-1.5 transition-colors ${
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
        </button>

        <button
          type="button"
          onClick={() => setHelpModalOpen(true)}
          aria-label="Quick Help & Shortcuts"
          title="Quick Help & Shortcuts"
          className="flex h-6.5 w-6.5 cursor-pointer items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/80 text-xs font-bold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-slate-700/80 hover:text-white"
        >
          ?
        </button>
      </div>
    </header>
  );
});
