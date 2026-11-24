import { useEffect } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';

/**
 * Quick Guide & Keyboard Shortcuts modal triggered by TopHud's "?" button.
 */
export function HelpModal() {
  const helpModalOpen = useSimulatorStore((s) => s.helpModalOpen);
  const setHelpModalOpen = useSimulatorStore((s) => s.setHelpModalOpen);

  useEffect(() => {
    if (!helpModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setHelpModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [helpModalOpen, setHelpModalOpen]);

  if (!helpModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bcube-help-title"
      onClick={() => setHelpModalOpen(false)}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-slate-100 shadow-2xl sm:p-5"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <h2 id="bcube-help-title" className="text-base font-bold text-white">
              bCube 3D Simulator — Quick Guide &amp; Shortcuts
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close help modal"
            onClick={() => setHelpModalOpen(false)}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3.5 text-xs leading-relaxed text-slate-300">
          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="font-semibold text-sky-300">1. Dual-Hole Jumper Wiring</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                Click any white header hole to start a wire, then click a destination hole to snap
                and connect.
              </li>
              <li>
                Every pin has <strong>two holes (A &amp; B)</strong> shorted internally—branch one
                switch or gate output to multiple inputs without stacking plugs.
              </li>
              <li>
                <strong>Right-Click</strong> a wire (or click to select + press{' '}
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">Delete</kbd>) to
                remove it. Press{' '}
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">Ctrl+Z</kbd> to
                undo, or <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">Esc</kbd>{' '}
                / Right-Click to cancel wiring.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="font-semibold text-emerald-300">2. Switches, Buttons &amp; LEDs</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                <strong>Slide Switches (SW1–SW16):</strong> Click to toggle (<code>ON = 1 / +5V</code>
                , <code>OFF = 0 / GND</code>).
              </li>
              <li>
                <strong>Pushbuttons (BTN1–BTN4 — Active-Low):</strong> Hold for momentary{' '}
                <code>0 / LOW</code> (released = <code>1 / HIGH</code>).{' '}
                <strong>Shift+Click</strong> or <strong>Double-Click</strong> to latch down.
              </li>
              <li>
                <strong>7402 NOR PCB Routing:</strong> All gate inputs are routed to the{' '}
                <strong>LEFT</strong> header and outputs to the <strong>RIGHT</strong> header.
              </li>
              <li>
                <strong>Click Any Black IC Chip:</strong> Click/tap <code>SN74LSxxN</code> chips to
                inspect the internal DIP-14 schematic, live pin wiring, truth table, and Boolean
                equation.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="font-semibold text-amber-300">3. Camera &amp; Lab Study Tools</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">V</kbd> to
                toggle between <strong>3D Free View</strong> and zero-parallax{' '}
                <strong>2D Wiring View</strong>; press{' '}
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">R</kbd> to reset
                camera framing.
              </li>
              <li>
                <strong>X-Ray:</strong> Lights up <code>HIGH (1)</code> jumper wires in vivid green
                and dims <code>LOW (0)</code> wires for instant signal tracing.
              </li>
              <li>
                <strong>Truth Table &amp; Lab Challenges:</strong> Auto-sweep connected inputs,
                click any row to test it live, or auto-grade your wired circuits across 5 labs.
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setHelpModalOpen(false)}
            className="cursor-pointer rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-400"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
