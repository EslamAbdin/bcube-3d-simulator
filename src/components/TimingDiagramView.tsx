import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateTimingDiagram,
  type TimingChannel,
  type TimingStep,
} from '../engine/circuitAnalyzer';
import type { SignalLevel } from '../engine/gateEvaluators';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playSlideClick } from '../utils/soundEffects';

type ChannelFilter = 'all' | 'io-gate-out' | 'io-only';

function channelStrokeColor(ch: TimingChannel): string {
  if (ch.kind === 'input') return '#38bdf8';
  if (ch.kind === 'gate_input') return '#c084fc';
  if (ch.kind === 'gate_output') return '#4ade80';
  return ch.bank === 'blue' ? '#60a5fa' : '#fb7185';
}

function channelFillColor(ch: TimingChannel): string {
  if (ch.kind === 'input') return 'rgba(56, 189, 248, 0.14)';
  if (ch.kind === 'gate_input') return 'rgba(192, 132, 252, 0.14)';
  if (ch.kind === 'gate_output') return 'rgba(74, 222, 128, 0.16)';
  return ch.bank === 'blue' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(251, 113, 133, 0.15)';
}

function signalY(sig: SignalLevel, yHigh: number, yMid: number, yLow: number): number {
  return sig === 'HIGH' ? yHigh : sig === 'LOW' ? yLow : yMid;
}

function liveBitMatchesStep(
  step: TimingStep,
  switches: Record<string, boolean>,
  buttons: Record<string, boolean>
): boolean {
  return Object.entries(step.inputValues).every(([id, expectedBit]) => {
    if (id in switches) {
      return (switches[id] ? 1 : 0) === expectedBit;
    }
    if (id in buttons) {
      return (buttons[id] ? 0 : 1) === expectedBit;
    }
    return true;
  });
}

/**
 * Interactive vector Digital Timing Diagram (oscilloscope / logic analyzer waveforms)
 * for all connected board inputs, IC gate input/output pins, and LED outputs.
 */
export const TimingDiagramView = memo(function TimingDiagramView() {
  const wires = useSimulatorStore((s) => s.wires);
  const switches = useSimulatorStore((s) => s.switches);
  const buttons = useSimulatorStore((s) => s.buttons);
  const ttlFloatingIsHigh = useSimulatorStore((s) => s.ttlFloatingIsHigh);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);
  const applyInputVector = useSimulatorStore((s) => s.applyInputVector);
  const showToast = useSimulatorStore((s) => s.showToast);

  const svgRef = useRef<SVGSVGElement>(null);
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);

  const diagram = useMemo(
    () => generateTimingDiagram(wires, { ttlFloatingIsHigh }),
    [wires, ttlFloatingIsHigh]
  );

  const visibleChannels = useMemo(() => {
    if (filter === 'all') return diagram.channels;
    if (filter === 'io-gate-out') {
      return diagram.channels.filter((c) => c.kind !== 'gate_input');
    }
    return diagram.channels.filter((c) => c.kind === 'input' || c.kind === 'output');
  }, [diagram.channels, filter]);

  const activeStepIdx = useMemo(() => {
    if (diagram.steps.length === 0) return -1;
    if (
      selectedStepIdx !== null &&
      diagram.steps[selectedStepIdx] &&
      liveBitMatchesStep(diagram.steps[selectedStepIdx], switches, buttons)
    ) {
      return selectedStepIdx;
    }
    return diagram.steps.findIndex((st) => liveBitMatchesStep(st, switches, buttons));
  }, [diagram.steps, selectedStepIdx, switches, buttons]);

  // Pause sweep cleanly if wiring changes
  useEffect(() => {
    setIsPlaying(false);
    setSelectedStepIdx(null);
  }, [wires]);

  // Auto-play clock sweep across time slots t0..t_{N-1}
  useEffect(() => {
    if (!isPlaying || diagram.steps.length === 0) return;
    const total = diagram.steps.length;
    const timer = window.setInterval(() => {
      setSelectedStepIdx((prev) => {
        const current = prev !== null && prev >= 0 && prev < total ? prev : Math.max(0, activeStepIdx);
        const nextIdx = (current + 1) % total;
        applyInputVector(diagram.steps[nextIdx].inputValues);
        return nextIdx;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [isPlaying, diagram.steps, activeStepIdx, applyInputVector]);

  const handleSelectStep = (step: TimingStep) => {
    setIsPlaying(false);
    setSelectedStepIdx(step.index);
    applyInputVector(step.inputValues);
    if (soundEnabled) playSlideClick(true);
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const raw = serializer.serializeToString(svgRef.current);
    const blob = new Blob([raw], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bcube-timing-diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported bcube-timing-diagram.svg', 'success');
  };

  if (diagram.steps.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Pin Timing Diagram (Waveforms)</h2>
          <p className="text-[11px] text-slate-400">
            Visualizes logic signals over time across every wired input, IC gate pin, and output LED.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center text-xs text-slate-400">
          Wire at least one input (<code className="text-sky-300">SW1–SW16</code> /{' '}
          <code className="text-sky-300">BTN1–BTN4</code>) to a logic gate or LED, or load a Lab
          Preset / Teaching Lesson to view the pin timing diagram.
        </div>
      </div>
    );
  }

  const labelColW = 108;
  const stepCount = diagram.steps.length;
  const slotW = stepCount <= 4 ? 82 : stepCount <= 8 ? 50 : 32;
  const headerH = 28;
  const rowH = 44;
  const padR = 14;
  const svgW = labelColW + stepCount * slotW + padR;
  const svgH = headerH + visibleChannels.length * rowH + 8;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">Pin Timing Diagram (All Wired Pins)</h2>
          <p className="text-[11px] text-slate-400">
            Click any time slot (<code className="text-sky-300">t0..t{stepCount - 1}</code>) or press Play to step the 3D board.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (!isPlaying && activeStepIdx < 0 && diagram.steps[0]) {
                applyInputVector(diagram.steps[0].inputValues);
                setSelectedStepIdx(0);
              }
              setIsPlaying((v) => !v);
            }}
            className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              isPlaying
                ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                : 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            type="button"
            onClick={handleExportSvg}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-sky-400/60 hover:text-white"
          >
            Save SVG
          </button>
        </div>
      </div>

      {/* Filter Pills + Color Key */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/75 p-0.5 text-[11px]">
          {(
            [
              ['all', `All Pins (${diagram.channels.length})`],
              ['io-gate-out', 'I/O + Gate Out'],
              ['io-only', 'I/O Only'],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`cursor-pointer rounded-md px-2 py-0.5 font-medium transition-colors ${
                filter === id ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> In
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-400" /> Gate In
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Gate Out
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> LED
          </span>
        </div>
      </div>

      {diagram.truncated && diagram.truncatedNote && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200">
          {diagram.truncatedNote}
        </div>
      )}

      {/* Always LTR SVG Waveform Canvas */}
      <div
        dir="ltr"
        className="overflow-x-auto rounded-xl border border-slate-700/80 bg-[#050b16] shadow-inner"
      >
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block select-none font-sans"
        >
          {/* Solid backdrop so exported SVGs preserve dark theme */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#050b16" />

          {/* Header bar background */}
          <rect x={0} y={0} width={svgW} height={headerH} fill="#0b1324" />
          <text
            x={10}
            y={headerH / 2 + 4}
            fill="#94a3b8"
            fontSize="11"
            fontWeight="700"
          >
            PIN / SIGNAL
          </text>

          {/* Active Live Step Highlight Column */}
          {activeStepIdx >= 0 && (
            <rect
              x={labelColW + activeStepIdx * slotW}
              y={0}
              width={slotW}
              height={svgH}
              fill="rgba(56, 189, 248, 0.13)"
              stroke="rgba(56, 189, 248, 0.45)"
              strokeWidth="1"
            />
          )}

          {/* Vertical time-slot grid lines & time headers */}
          {diagram.steps.map((step, i) => {
            const x = labelColW + i * slotW;
            const isActive = i === activeStepIdx;
            return (
              <g key={step.index}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={svgH}
                  stroke={isActive ? 'rgba(56,189,248,0.45)' : 'rgba(51,65,85,0.5)'}
                  strokeDasharray={isActive ? undefined : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={x + slotW / 2}
                  y={headerH / 2 + 4}
                  textAnchor="middle"
                  fill={step.hasConflict ? '#f87171' : isActive ? '#38bdf8' : '#cbd5e1'}
                  fontSize="11"
                  fontWeight={isActive ? '800' : '600'}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {step.label}
                </text>
              </g>
            );
          })}
          <line
            x1={labelColW + stepCount * slotW}
            y1={0}
            x2={labelColW + stepCount * slotW}
            y2={svgH}
            stroke="rgba(51,65,85,0.5)"
            strokeWidth="1"
          />

          {/* Waveform Rows */}
          {visibleChannels.map((ch, rowIdx) => {
            const top = headerH + rowIdx * rowH;
            const yHigh = top + 10;
            const yMid = top + 22;
            const yLow = top + 34;
            const stroke = channelStrokeColor(ch);
            const fill = channelFillColor(ch);
            const activeSample = activeStepIdx >= 0 ? ch.samples[activeStepIdx] : undefined;

            return (
              <g key={ch.id}>
                {/* Subtle alternating row band & bottom divider */}
                {rowIdx % 2 === 1 && (
                  <rect
                    x={0}
                    y={top}
                    width={svgW}
                    height={rowH}
                    fill="rgba(15, 23, 42, 0.42)"
                  />
                )}
                <line
                  x1={0}
                  y1={top + rowH}
                  x2={svgW}
                  y2={top + rowH}
                  stroke="rgba(30, 41, 59, 0.85)"
                  strokeWidth="1"
                />

                {/* +5V & 0V reference rails */}
                <line
                  x1={labelColW}
                  y1={yHigh}
                  x2={labelColW + stepCount * slotW}
                  y2={yHigh}
                  stroke="rgba(51, 65, 85, 0.28)"
                  strokeWidth="1"
                />
                <line
                  x1={labelColW}
                  y1={yLow}
                  x2={labelColW + stepCount * slotW}
                  y2={yLow}
                  stroke="rgba(51, 65, 85, 0.28)"
                  strokeWidth="1"
                />

                {/* Left Pin Label + Role */}
                <text
                  x={10}
                  y={top + 18}
                  fill={stroke}
                  fontSize="11.5"
                  fontWeight="700"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {ch.label}
                </text>
                <text x={10} y={top + 32} fill="#94a3b8" fontSize="9.5" fontWeight="500">
                  {ch.subLabel}
                </text>

                {/* Active sample quick bit badge in label gutter */}
                {activeSample && (
                  <g>
                    <rect
                      x={labelColW - 24}
                      y={top + 14}
                      width={18}
                      height={16}
                      rx={4}
                      fill={
                        activeSample === 'HIGH'
                          ? 'rgba(34,197,94,0.22)'
                          : activeSample === 'CONFLICT'
                            ? 'rgba(239,68,68,0.28)'
                            : 'rgba(30,41,59,0.9)'
                      }
                      stroke={
                        activeSample === 'HIGH'
                          ? '#4ade80'
                          : activeSample === 'CONFLICT'
                            ? '#ef4444'
                            : '#475569'
                      }
                      strokeWidth="1"
                    />
                    <text
                      x={labelColW - 15}
                      y={top + 25.5}
                      textAnchor="middle"
                      fill={
                        activeSample === 'HIGH'
                          ? '#86efac'
                          : activeSample === 'CONFLICT'
                            ? '#fca5a5'
                            : '#cbd5e1'
                      }
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {activeSample === 'HIGH'
                        ? '1'
                        : activeSample === 'LOW'
                          ? '0'
                          : activeSample === 'CONFLICT'
                            ? '!'
                            : 'Z'}
                    </text>
                  </g>
                )}

                {/* Per-Slot Orthogonal Waveforms & Transition Edges */}
                {ch.samples.map((sig, i) => {
                  const x0 = labelColW + i * slotW;
                  const x1 = x0 + slotW;
                  const prevSig = i > 0 ? ch.samples[i - 1] : null;
                  const yCurr = signalY(sig, yHigh, yMid, yLow);
                  const yPrev = prevSig ? signalY(prevSig, yHigh, yMid, yLow) : yCurr;
                  const drawEdge =
                    prevSig &&
                    (sig === 'HIGH' || sig === 'LOW') &&
                    (prevSig === 'HIGH' || prevSig === 'LOW') &&
                    sig !== prevSig;

                  return (
                    <g key={i}>
                      {sig === 'HIGH' && (
                        <>
                          <rect x={x0} y={yHigh} width={slotW} height={yLow - yHigh} fill={fill} />
                          <line
                            x1={x0}
                            y1={yHigh}
                            x2={x1}
                            y2={yHigh}
                            stroke={stroke}
                            strokeWidth="2.4"
                            strokeLinecap="square"
                          />
                        </>
                      )}

                      {sig === 'LOW' && (
                        <line
                          x1={x0}
                          y1={yLow}
                          x2={x1}
                          y2={yLow}
                          stroke={stroke}
                          strokeOpacity="0.65"
                          strokeWidth="2.2"
                          strokeLinecap="square"
                        />
                      )}

                      {sig === 'FLOATING' && (
                        <>
                          <line
                            x1={x0 + 2}
                            y1={yMid}
                            x2={x1 - 2}
                            y2={yMid}
                            stroke="#64748b"
                            strokeDasharray="4 3"
                            strokeWidth="1.6"
                          />
                          <text
                            x={x0 + slotW / 2}
                            y={yMid - 4}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="9"
                            fontWeight="700"
                          >
                            Z
                          </text>
                        </>
                      )}

                      {sig === 'CONFLICT' && (
                        <>
                          <rect
                            x={x0}
                            y={yHigh}
                            width={slotW}
                            height={yLow - yHigh}
                            fill="rgba(239, 68, 68, 0.28)"
                            stroke="#ef4444"
                            strokeWidth="1.4"
                          />
                          <text
                            x={x0 + slotW / 2}
                            y={yMid + 4}
                            textAnchor="middle"
                            fill="#fecaca"
                            fontSize="11"
                            fontWeight="800"
                          >
                            !
                          </text>
                        </>
                      )}

                      {drawEdge && (
                        <line
                          x1={x0}
                          y1={yPrev}
                          x2={x0}
                          y2={yCurr}
                          stroke={stroke}
                          strokeWidth="2.4"
                          strokeLinecap="square"
                        />
                      )}

                      {(sig === 'HIGH' || sig === 'LOW') && slotW >= 36 && (
                        <text
                          x={x0 + slotW / 2}
                          y={sig === 'HIGH' ? yHigh + 14 : yLow - 5}
                          textAnchor="middle"
                          fill={sig === 'HIGH' ? stroke : '#64748b'}
                          fillOpacity={sig === 'HIGH' ? 0.9 : 0.85}
                          fontSize="9.5"
                          fontWeight="700"
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                        >
                          {sig === 'HIGH' ? '1' : '0'}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Label column separator */}
          <line
            x1={labelColW}
            y1={0}
            x2={labelColW}
            y2={svgH}
            stroke="rgba(71, 85, 105, 0.85)"
            strokeWidth="1.2"
          />

          {/* Full-column click hitboxes for jumping straight to any time slot */}
          {diagram.steps.map((step, i) => (
            <rect
              key={`hit-${step.index}`}
              x={labelColW + i * slotW}
              y={0}
              width={slotW}
              height={svgH}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => handleSelectStep(step)}
            >
              <title>{`Apply ${step.label} inputs to 3D board`}</title>
            </rect>
          ))}
        </svg>
      </div>
    </div>
  );
});
