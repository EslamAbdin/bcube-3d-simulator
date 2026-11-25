import { memo, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { PRESET_CIRCUITS } from '../data/presetCircuits';
import { useSimulatorStore, WIRE_COLORS } from '../store/useSimulatorStore';
import { playSlideClick, playWireUnplug } from '../utils/soundEffects';

/**
 * Responsive HUD Top Bar:
 * - >= 1280px (1366px+ laptops & desktops): crisp single-row glass bar
 * - < 1280px (mobile / portrait phones): ultra-compact strip (<= 15% top area) + collapsible Tools menu
 */
export const TopHud = memo(function TopHud() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const touchTwoFingerMode = useSimulatorStore((s) => s.touchTwoFingerMode);
  const toggleTouchTwoFingerMode = useSimulatorStore((s) => s.toggleTouchTwoFingerMode);
  const resetInputs = useSimulatorStore((s) => s.resetInputs);
  const ttlFloatingIsHigh = useSimulatorStore((s) => s.ttlFloatingIsHigh);
  const setTtlFloatingIsHigh = useSimulatorStore((s) => s.setTtlFloatingIsHigh);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);
  const toggleSound = useSimulatorStore((s) => s.toggleSound);
  const performanceMode = useSimulatorStore((s) => s.performanceMode);
  const togglePerformanceMode = useSimulatorStore((s) => s.togglePerformanceMode);
  const teachingMode = useSimulatorStore((s) => s.teachingMode);
  const teachingLang = useSimulatorStore((s) => s.teachingLang);
  const toggleTeachingMode = useSimulatorStore((s) => s.toggleTeachingMode);

  const errorWarningsEnabled = useSimulatorStore((s) => s.errorWarningsEnabled);
  const toggleErrorWarnings = useSimulatorStore((s) => s.toggleErrorWarnings);
  const ercErrorCount = useSimulatorStore((s) =>
    s.wiringDiagnostics.reduce((acc, d) => (d.severity === 'error' ? acc + 1 : acc), 0)
  );
  const ercTotalCount = useSimulatorStore((s) => s.wiringDiagnostics.length);

  useEffect(() => {
    const syncFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    syncFs();
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const active = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

    try {
      if (active) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else {
        if (el.requestFullscreen) {
          try {
            await el.requestFullscreen({ navigationUI: 'hide' });
          } catch {
            await el.requestFullscreen();
          }
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else {
          showToast('For iPhone fullscreen, tap Share → Add to Home Screen.', 'info');
        }
      }
    } catch {
      showToast('For iPhone fullscreen, tap Share → Add to Home Screen.', 'info');
    }
  };

  useEffect(() => {
    if (!fileMenuOpen && !mobileMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (fileMenuOpen && fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFileMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fileMenuOpen, mobileMenuOpen]);

  const handleResetInputs = () => {
    resetInputs();
    setFileMenuOpen(false);
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
    if (soundEnabled) playSlideClick(true);
  };

  const handleCycleWireColor = () => {
    const idx = WIRE_COLORS.findIndex((c) => c.hex.toLowerCase() === activeWireColor.toLowerCase());
    const next = WIRE_COLORS[(idx + 1) % WIRE_COLORS.length];
    setActiveWireColor(next.hex);
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
    setMobileMenuOpen(false);
    showToast('Exported bcube-circuit.json', 'success');
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setFileMenuOpen(false);
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
  };

  const ercPillTone = !errorWarningsEnabled
    ? 'border-slate-700/80 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-slate-200'
    : ercErrorCount > 0
      ? 'border-rose-400/75 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
      : ercTotalCount > 0
        ? 'border-amber-400/75 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
        : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25';

  const pillClass =
    'pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-700/75 bg-slate-900/88 px-2 py-1 text-slate-100 shadow-2xl backdrop-blur-md';

  return (
    <header className="pointer-events-none fixed top-2 right-2 left-2 z-20 sm:top-2.5 sm:right-3 sm:left-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Ultra-Compact Mobile & Tablet Top Bar (< 1280px, tested on 390×844) */}
      <div className="flex flex-col items-stretch gap-1.5 xl:hidden" ref={mobileMenuRef}>
        <div className="pointer-events-auto flex items-center justify-between gap-1 rounded-xl border border-slate-700/75 bg-slate-900/90 px-2 py-1 text-slate-100 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
            <span className="whitespace-nowrap text-[11px] font-semibold tracking-wide text-slate-100">
              bCube
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/75 p-0.5">
              <button
                type="button"
                onClick={() => setCameraMode('3d')}
                className={`cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                  cameraMode === '3d' ? 'bg-sky-500 text-white' : 'text-slate-300'
                }`}
              >
                3D
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('2d')}
                className={`cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                  cameraMode === '2d' ? 'bg-sky-500 text-white' : 'text-slate-300'
                }`}
              >
                2D
              </button>
            </div>

            {cameraMode === '3d' && (
              <button
                type="button"
                onClick={toggleTouchTwoFingerMode}
                aria-label="Toggle 2-finger gesture mode"
                title="2-finger camera mode: Orbit+Zoom or Pan+Zoom"
                className="cursor-pointer whitespace-nowrap rounded-md border border-slate-700/80 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200"
              >
                2F:{touchTwoFingerMode === 'orbit' ? 'Orbit' : 'Pan'}
              </button>
            )}

            <button
              type="button"
              onClick={handleCycleWireColor}
              aria-label="Cycle active wire color"
              title="Tap to cycle wire color"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-slate-700/80 bg-slate-800/80"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-white/80"
                style={{ backgroundColor: activeWireColor }}
              />
            </button>

            {wireCount > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="cursor-pointer rounded-md border border-slate-700/80 bg-slate-800/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-200"
              >
                Undo
              </button>
            )}

            <button
              type="button"
              onClick={toggleErrorWarnings}
              aria-pressed={errorWarningsEnabled}
              aria-label="Toggle ERC wiring error warnings"
              className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${ercPillTone}`}
            >
              <span>ERC</span>
              {errorWarningsEnabled && ercTotalCount > 0 && (
                <span
                  className={`rounded-full px-1 text-[10px] font-bold ${
                    ercErrorCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {ercTotalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter immersive fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (hide browser & nav bars)'}
              className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                isFullscreen
                  ? 'border-sky-400/75 bg-sky-500/25 text-sky-200'
                  : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
              }`}
            >
              {isFullscreen ? '⤢' : '⛶'}
            </button>

            <button
              type="button"
              aria-label="Toggle tools menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`cursor-pointer whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                mobileMenuOpen
                  ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                  : 'border-slate-700/80 bg-slate-800/90 text-slate-100'
              }`}
            >
              Menu {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="pointer-events-auto flex max-h-[72vh] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur-lg">
            {/* Presets */}
            <div className="flex items-center gap-2">
              <label htmlFor="mobile-preset-select" className="text-[11px] font-semibold text-slate-400">
                Preset
              </label>
              <select
                id="mobile-preset-select"
                aria-label="Load lab preset mobile"
                value={activePresetInfo?.id ?? ''}
                onChange={handlePresetChange}
                className="flex-1 cursor-pointer rounded-lg border border-slate-700/80 bg-slate-950/90 px-2 py-1.5 text-xs font-medium text-slate-200 focus:border-sky-400 focus:outline-none"
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
            </div>

            {/* Study, Visualizers & Reset */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  toggleTeachingMode();
                  setMobileMenuOpen(false);
                }}
                aria-pressed={teachingMode}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  teachingMode
                    ? 'border-emerald-400/75 bg-emerald-500/25 text-emerald-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                }`}
              >
                {teachingMode && teachingLang === 'ar' ? 'شرح' : 'Teach'}
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleSignalFlow();
                  setMobileMenuOpen(false);
                }}
                aria-pressed={signalFlowEnabled}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  signalFlowEnabled
                    ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                }`}
              >
                X-Ray
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerCameraReset();
                  setMobileMenuOpen(false);
                }}
                className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1.5 text-xs font-medium text-slate-200"
              >
                Reset View
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleDrawerTab('truth-table');
                  setMobileMenuOpen(false);
                }}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  activeDrawerTab === 'truth-table'
                    ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                }`}
              >
                Truth Table
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleDrawerTab('timing');
                  setMobileMenuOpen(false);
                }}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  activeDrawerTab === 'timing'
                    ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                }`}
              >
                Timing
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleDrawerTab('challenges');
                  setMobileMenuOpen(false);
                }}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                  activeDrawerTab === 'challenges'
                    ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                }`}
              >
                Challenges
              </button>
            </div>

            {/* Wire Colors + Clear */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                {WIRE_COLORS.map((c) => {
                  const active = activeWireColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.name}
                      type="button"
                      aria-label={`Mobile wire color ${c.name}`}
                      onClick={() => setActiveWireColor(c.hex)}
                      className={`h-4.5 w-4.5 cursor-pointer rounded-full border ${
                        active ? 'scale-110 border-white ring-2 ring-sky-400' : 'border-slate-500/80'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={toggleAutoCycleWireColor}
                  className={`ml-1 cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                    autoCycleWireColor
                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700/80 bg-slate-800/80 text-slate-400'
                  }`}
                >
                  Auto
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">{wireCount}w</span>
                <button
                  type="button"
                  disabled={wireCount === 0}
                  onClick={handleClearWires}
                  className="cursor-pointer rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-rose-200 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Graphics, TTL, Sound & Help */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={togglePerformanceMode}
                aria-pressed={performanceMode === 'eco'}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                  performanceMode === 'eco'
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                }`}
              >
                {performanceMode === 'high' ? 'HQ' : 'Eco'}
              </button>
              <button
                type="button"
                onClick={() => setTtlFloatingIsHigh(!ttlFloatingIsHigh)}
                className={`cursor-pointer rounded-lg border px-1.5 py-1.5 text-[11px] font-medium ${
                  ttlFloatingIsHigh
                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-300'
                }`}
              >
                TTL:{ttlFloatingIsHigh ? '1' : '0'}
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className={`cursor-pointer rounded-lg border px-1.5 py-1.5 text-[11px] font-medium ${
                  soundEnabled
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-400'
                }`}
              >
                {soundEnabled ? 'Sound' : 'Muted'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHelpModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1.5 text-[11px] font-semibold text-sky-300"
              >
                Help
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                handleToggleFullscreen();
                setMobileMenuOpen(false);
              }}
              className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                isFullscreen
                  ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700/80 bg-slate-800/80 text-slate-200'
              }`}
            >
              {isFullscreen ? 'Exit Fullscreen' : '⛶ Immersive Fullscreen (Hide Bars)'}
            </button>

            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-800 pt-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="cursor-pointer rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[11px] font-medium text-slate-200"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[11px] font-medium text-slate-200"
              >
                Import JSON…
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="cursor-pointer rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[11px] font-medium text-sky-300"
              >
                {copiedLink ? 'Copied!' : 'Copy Share Link'}
              </button>
              <button
                type="button"
                onClick={handleResetInputs}
                className="cursor-pointer rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[11px] font-medium text-amber-200"
              >
                Reset Inputs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Single-Row Top Bar (>= 1280px, ergonomic for 1366×768+) */}
      <div className="hidden w-full items-center justify-between gap-1.5 xl:flex">
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
            className="max-w-[138px] cursor-pointer truncate rounded-lg border border-slate-700/80 bg-slate-950/90 px-1.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 focus:border-sky-400 focus:outline-none"
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
        </div>

        {/* Center: Wire Palette, X-Ray Signal Flow, ERC Toggle, Undo & Clear */}
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
            title="Auto-cycle wire color"
            className={`cursor-pointer rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
              autoCycleWireColor
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
            className={`cursor-pointer whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
              signalFlowEnabled
                ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            X-Ray
          </button>

          <button
            type="button"
            onClick={toggleErrorWarnings}
            aria-pressed={errorWarningsEnabled}
            title="Toggle Electrical & Logic Error Checker (ERC)"
            className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${ercPillTone}`}
          >
            <span>ERC: {errorWarningsEnabled ? 'ON' : 'OFF'}</span>
            {errorWarningsEnabled && ercTotalCount > 0 && (
              <span
                className={`rounded-full px-1 text-[10px] font-bold leading-tight ${
                  ercErrorCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-950'
                }`}
              >
                {ercTotalCount}
              </span>
            )}
          </button>

          <span className="whitespace-nowrap rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
            {wireCount}w
          </span>

          <button
            type="button"
            disabled={wireCount === 0}
            onClick={handleUndo}
            title="Undo last wire (Ctrl+Z)"
            className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-1.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>

          <button
            type="button"
            disabled={wireCount === 0}
            onClick={handleClearWires}
            title="Remove all jumper wires"
            className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-800/80 px-1.5 py-1 text-[11px] font-medium text-rose-200 transition-colors hover:border-rose-400/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        {/* Right: Study Workbench Tabs, Teaching Mode, Camera Mode, TTL, Perf, Sound & Help */}
        <div className={pillClass}>
          <button
            type="button"
            onClick={toggleTeachingMode}
            aria-pressed={teachingMode}
            title="Toggle Bilingual Teaching Mode (Simple English / عربي)"
            className={`cursor-pointer whitespace-nowrap rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors ${
              teachingMode
                ? 'border-emerald-400/75 bg-emerald-500/25 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.28)]'
                : 'border-slate-700/80 bg-slate-800/80 text-emerald-300 hover:border-emerald-400/60'
            }`}
          >
            {teachingMode && teachingLang === 'ar' ? 'تعلّم' : 'Teach'}
          </button>

          <button
            type="button"
            onClick={() => toggleDrawerTab('truth-table')}
            aria-pressed={activeDrawerTab === 'truth-table'}
            className={`cursor-pointer whitespace-nowrap rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors ${
              activeDrawerTab === 'truth-table'
                ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-slate-500'
            }`}
          >
            Truth Table
          </button>

          <button
            type="button"
            onClick={() => toggleDrawerTab('timing')}
            aria-pressed={activeDrawerTab === 'timing'}
            title="Pin Timing Diagram (Input, IC Gate & Output Waveforms)"
            className={`cursor-pointer whitespace-nowrap rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors ${
              activeDrawerTab === 'timing'
                ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-slate-500'
            }`}
          >
            Timing
          </button>

          <button
            type="button"
            onClick={() => toggleDrawerTab('challenges')}
            aria-pressed={activeDrawerTab === 'challenges'}
            className={`cursor-pointer whitespace-nowrap rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors ${
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
              className={`cursor-pointer whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                cameraMode === '3d'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => setCameraMode('2d')}
              className={`cursor-pointer whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                cameraMode === '2d'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2D (V)
            </button>
          </div>

          <button
            type="button"
            onClick={triggerCameraReset}
            title="Reset Camera (R)"
            className="cursor-pointer whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-800/80 px-1.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700/80"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => setTtlFloatingIsHigh(!ttlFloatingIsHigh)}
            title="Beginner mode (OFF): unconnected gate inputs stay FLOATING. Real TTL (HIGH): unconnected inputs float +5V."
            className={`cursor-pointer whitespace-nowrap rounded-lg border px-1.5 py-1 text-[11px] font-medium transition-colors ${
              ttlFloatingIsHigh
                ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            TTL:{ttlFloatingIsHigh ? '1' : '0'}
          </button>

          <button
            type="button"
            onClick={togglePerformanceMode}
            aria-pressed={performanceMode === 'eco'}
            title={
              performanceMode === 'high'
                ? 'Graphics: High Quality (DPR 1.5, soft shadows, smooth wire curves). Click for Eco mode.'
                : 'Graphics: Eco / Phone Mode (DPR 1, shadows disabled). Click for High Quality.'
            }
            className={`cursor-pointer whitespace-nowrap rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition-colors ${
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
            className={`flex cursor-pointer items-center justify-center rounded-lg border p-1 transition-colors ${
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
            onClick={handleToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen mode'}
            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
              isFullscreen
                ? 'border-sky-400/70 bg-sky-500/25 text-sky-200'
                : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:text-white'
            }`}
          >
            {isFullscreen ? '⤢' : '⛶'}
          </button>

          <button
            type="button"
            onClick={() => setHelpModalOpen(true)}
            aria-label="Quick Help & Shortcuts"
            title="Quick Help & Shortcuts"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/80 text-xs font-bold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-slate-700/80 hover:text-white"
          >
            ?
          </button>
        </div>
      </div>
    </header>
  );
});
