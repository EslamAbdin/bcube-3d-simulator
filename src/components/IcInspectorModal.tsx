import { memo, useEffect, useMemo } from 'react';
import {
  IC_DATASHEETS,
  IC_ORDER,
  getIcPinWireSummary,
  type IcDatasheetSpec,
  type IcEquationTerm,
} from '../data/icDatasheets';
import { TEACHING_LESSONS } from '../data/teachingContent';
import type { SignalLevel } from '../engine/gateEvaluators';
import type { ActiveGateModuleType } from '../schema/boardSchema';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { playSlideClick } from '../utils/soundEffects';

const PIN_X = [108, 178, 248, 318, 388, 458, 528];

function pinCoords(pinNumber: number): { x: number; edgeY: number; isTop: boolean } {
  if (pinNumber <= 7) {
    return { x: PIN_X[pinNumber - 1], edgeY: 222, isTop: false };
  }
  return { x: PIN_X[14 - pinNumber], edgeY: 58, isTop: true };
}

function signalColor(sig: SignalLevel | 'VCC' | 'GND', dimmed = false): string {
  if (sig === 'VCC') return '#fb7185';
  if (sig === 'GND') return '#60a5fa';
  if (sig === 'HIGH') return '#4ade80';
  if (sig === 'LOW') return '#f87171';
  if (sig === 'CONFLICT') return '#f59e0b';
  return dimmed ? '#475569' : '#94a3b8';
}

function EquationDisplay({ parts }: { parts: IcEquationTerm[] }) {
  return (
    <span
      dir="ltr"
      className="inline-flex items-baseline whitespace-pre font-mono text-base font-bold text-white sm:text-lg"
    >
      {parts.map((part, i) =>
        part.overline ? (
          <span key={i} className="inline-block border-t-2 border-sky-300 px-0.5 pt-0.5 leading-tight text-sky-200">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

function MiniGateSvg({
  gateName,
  cx,
  cy,
  facing,
  dimmed,
  outStroke,
}: {
  gateName: IcDatasheetSpec['gateName'];
  cx: number;
  cy: number;
  facing: 'right' | 'left';
  dimmed?: boolean;
  outStroke: string;
}) {
  const dir = facing === 'right' ? 1 : -1;
  const stroke = dimmed ? '#64748b' : outStroke;
  const fill = dimmed ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.85)';

  if (gateName === 'NOT') {
    const xBack = cx - 14 * dir;
    const xTip = cx + 10 * dir;
    const xBub = cx + 14 * dir;
    return (
      <g>
        <polygon
          points={`${xBack},${cy - 11} ${xTip},${cy} ${xBack},${cy + 11}`}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray={dimmed ? '3 2' : undefined}
        />
        <circle cx={xBub} cy={cy} r={3.5} fill="#0b1324" stroke={stroke} strokeWidth="1.8" />
      </g>
    );
  }

  if (gateName === 'AND' || gateName === 'NAND') {
    const hasBubble = gateName === 'NAND';
    const xBack = cx - 18 * dir;
    const xArcStart = cx + (hasBubble ? 0 : 4) * dir;
    const r = 13;
    const sweep = facing === 'right' ? 1 : 0;
    return (
      <g>
        <path
          d={`M ${xBack} ${cy - r} L ${xArcStart} ${cy - r} A ${r} ${r} 0 0 ${sweep} ${xArcStart} ${cy + r} L ${xBack} ${cy + r} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
        />
        {hasBubble && (
          <circle
            cx={xArcStart + (r + 4) * dir}
            cy={cy}
            r={3.5}
            fill="#0b1324"
            stroke={stroke}
            strokeWidth="1.8"
          />
        )}
      </g>
    );
  }

  // OR / NOR / XOR
  const hasBubble = gateName === 'NOR';
  const hasXor = gateName === 'XOR';
  const xBack = cx - (hasXor ? 15 : 18) * dir;
  const xNose = cx + (hasBubble ? 12 : 17) * dir;
  const xBackCtrl = cx - (hasXor ? 7 : 10) * dir;
  const xBodyCtrl = cx + (hasBubble ? 3 : 6) * dir;

  return (
    <g>
      {hasXor && (
        <path
          d={`M ${xBack - 5 * dir} ${cy - 13} Q ${xBack + 3 * dir} ${cy} ${xBack - 5 * dir} ${cy + 13}`}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
        />
      )}
      <path
        d={`M ${xBack} ${cy - 13} Q ${xBodyCtrl} ${cy - 13} ${xNose} ${cy} Q ${xBodyCtrl} ${cy + 13} ${xBack} ${cy + 13} Q ${xBackCtrl} ${cy} ${xBack} ${cy - 13} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {hasBubble && (
        <circle
          cx={xNose + 4.5 * dir}
          cy={cy}
          r={3.5}
          fill="#0b1324"
          stroke={stroke}
          strokeWidth="1.8"
        />
      )}
    </g>
  );
}

interface InternalGatePlacement {
  gateIndex: number;
  cx: number;
  cy: number;
  facing: 'right' | 'left';
  exposedOnBoard: boolean;
  paths: Array<{ pinNumber: number; d: string; isOut: boolean }>;
}

function buildGatePlacements(spec: IcDatasheetSpec): InternalGatePlacement[] {
  if (spec.layoutKind === 'standard-quad') {
    return [
      {
        gateIndex: 1,
        cx: 185,
        cy: 178,
        facing: 'right',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 1, d: 'M 108 222 L 108 171 L 167 171', isOut: false },
          { pinNumber: 2, d: 'M 178 222 L 178 205 L 152 205 L 152 185 L 167 185', isOut: false },
          { pinNumber: 3, d: 'M 203 178 L 248 178 L 248 222', isOut: true },
        ],
      },
      {
        gateIndex: 2,
        cx: 395,
        cy: 178,
        facing: 'right',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 4, d: 'M 318 222 L 318 171 L 377 171', isOut: false },
          { pinNumber: 5, d: 'M 388 222 L 388 205 L 362 205 L 362 185 L 377 185', isOut: false },
          { pinNumber: 6, d: 'M 413 178 L 458 178 L 458 222', isOut: true },
        ],
      },
      {
        gateIndex: 4,
        cx: 255,
        cy: 98,
        facing: 'right',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 13, d: 'M 178 58 L 178 91 L 237 91', isOut: false },
          { pinNumber: 12, d: 'M 248 58 L 248 73 L 222 73 L 222 105 L 237 105', isOut: false },
          { pinNumber: 11, d: 'M 273 98 L 318 98 L 318 58', isOut: true },
        ],
      },
      {
        gateIndex: 3,
        cx: 465,
        cy: 98,
        facing: 'right',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 10, d: 'M 388 58 L 388 91 L 447 91', isOut: false },
          { pinNumber: 9, d: 'M 458 58 L 458 73 L 432 73 L 432 105 L 447 105', isOut: false },
          { pinNumber: 8, d: 'M 483 98 L 528 98 L 528 58', isOut: true },
        ],
      },
    ];
  }

  if (spec.layoutKind === 'nor-quad') {
    return [
      {
        gateIndex: 1,
        cx: 171,
        cy: 178,
        facing: 'left',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 3, d: 'M 248 222 L 248 171 L 188 171', isOut: false },
          { pinNumber: 2, d: 'M 178 222 L 178 205 L 204 205 L 204 185 L 188 185', isOut: false },
          { pinNumber: 1, d: 'M 151 178 L 108 178 L 108 222', isOut: true },
        ],
      },
      {
        gateIndex: 2,
        cx: 381,
        cy: 178,
        facing: 'left',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 6, d: 'M 458 222 L 458 171 L 398 171', isOut: false },
          { pinNumber: 5, d: 'M 388 222 L 388 205 L 414 205 L 414 185 L 398 185', isOut: false },
          { pinNumber: 4, d: 'M 361 178 L 318 178 L 318 222', isOut: true },
        ],
      },
      {
        gateIndex: 4,
        cx: 241,
        cy: 98,
        facing: 'left',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 11, d: 'M 318 58 L 318 91 L 258 91', isOut: false },
          { pinNumber: 12, d: 'M 248 58 L 248 73 L 274 73 L 274 105 L 258 105', isOut: false },
          { pinNumber: 13, d: 'M 221 98 L 178 98 L 178 58', isOut: true },
        ],
      },
      {
        gateIndex: 3,
        cx: 451,
        cy: 98,
        facing: 'left',
        exposedOnBoard: true,
        paths: [
          { pinNumber: 8, d: 'M 528 58 L 528 91 L 468 91', isOut: false },
          { pinNumber: 9, d: 'M 458 58 L 458 73 L 484 73 L 484 105 L 468 105', isOut: false },
          { pinNumber: 10, d: 'M 431 98 L 388 98 L 388 58', isOut: true },
        ],
      },
    ];
  }

  // hex-not (7404: 6 inverters inside; gates 5 & 6 internal only on bCube)
  return [
    {
      gateIndex: 1,
      cx: 143,
      cy: 180,
      facing: 'right',
      exposedOnBoard: true,
      paths: [
        { pinNumber: 1, d: 'M 108 222 L 108 180 L 129 180', isOut: false },
        { pinNumber: 2, d: 'M 161 180 L 178 180 L 178 222', isOut: true },
      ],
    },
    {
      gateIndex: 2,
      cx: 283,
      cy: 180,
      facing: 'right',
      exposedOnBoard: true,
      paths: [
        { pinNumber: 3, d: 'M 248 222 L 248 180 L 269 180', isOut: false },
        { pinNumber: 4, d: 'M 301 180 L 318 180 L 318 222', isOut: true },
      ],
    },
    {
      gateIndex: 3,
      cx: 423,
      cy: 180,
      facing: 'right',
      exposedOnBoard: true,
      paths: [
        { pinNumber: 5, d: 'M 388 222 L 388 180 L 409 180', isOut: false },
        { pinNumber: 6, d: 'M 441 180 L 458 180 L 458 222', isOut: true },
      ],
    },
    {
      gateIndex: 6,
      cx: 213,
      cy: 100,
      facing: 'right',
      exposedOnBoard: false,
      paths: [
        { pinNumber: 13, d: 'M 178 58 L 178 100 L 199 100', isOut: false },
        { pinNumber: 12, d: 'M 231 100 L 248 100 L 248 58', isOut: true },
      ],
    },
    {
      gateIndex: 5,
      cx: 353,
      cy: 100,
      facing: 'right',
      exposedOnBoard: false,
      paths: [
        { pinNumber: 11, d: 'M 318 58 L 318 100 L 339 100', isOut: false },
        { pinNumber: 10, d: 'M 371 100 L 388 100 L 388 58', isOut: true },
      ],
    },
    {
      gateIndex: 4,
      cx: 493,
      cy: 100,
      facing: 'right',
      exposedOnBoard: true,
      paths: [
        { pinNumber: 9, d: 'M 458 58 L 458 100 L 479 100', isOut: false },
        { pinNumber: 8, d: 'M 511 100 L 528 100 L 528 58', isOut: true },
      ],
    },
  ];
}

/**
 * Interactive DIP-14 X-Ray & Datasheet modal opened when clicking any active IC chip.
 * Shows the live internal pinout schematic, Boolean equation, specs, truth table, and active wiring.
 */
export const IcInspectorModal = memo(function IcInspectorModal() {
  const inspectedIcType = useSimulatorStore((s) => s.inspectedIcType);
  const setInspectedIcType = useSimulatorStore((s) => s.setInspectedIcType);
  const lang = useSimulatorStore((s) => s.teachingLang);
  const setTeachingLang = useSimulatorStore((s) => s.setTeachingLang);
  const wires = useSimulatorStore((s) => s.wires);
  const socketStates = useSimulatorStore((s) => s.socketStates);
  const loadTeachingDemo = useSimulatorStore((s) => s.loadTeachingDemo);
  const showToast = useSimulatorStore((s) => s.showToast);
  const soundEnabled = useSimulatorStore((s) => s.soundEnabled);

  useEffect(() => {
    if (!inspectedIcType) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setInspectedIcType(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectedIcType, setInspectedIcType]);

  const spec = inspectedIcType ? IC_DATASHEETS[inspectedIcType] : null;
  const placements = useMemo(() => (spec ? buildGatePlacements(spec) : []), [spec]);
  const wireSummary = useMemo(
    () => (inspectedIcType ? getIcPinWireSummary(inspectedIcType, wires, socketStates) : []),
    [inspectedIcType, wires, socketStates]
  );

  if (!inspectedIcType || !spec) return null;

  const isAr = lang === 'ar';

  const getPinSignal = (pinNum: number): SignalLevel | 'VCC' | 'GND' => {
    if (pinNum === 14) return 'VCC';
    if (pinNum === 7) return 'GND';
    return socketStates[`${inspectedIcType}:PIN${pinNum}:A`] ?? 'FLOATING';
  };

  const handleLoadExample = () => {
    const lesson = TEACHING_LESSONS.find((l) => l.id === spec.demoLessonId);
    if (!lesson) return;
    loadTeachingDemo(lesson.wires, lesson.initialSwitches, {
      id: lesson.id,
      name: lesson.title[lang],
      description: lesson.summary[lang],
      controlsHint: lesson.controlsHint[lang],
    });
    showToast(
      isAr ? `تم توصيل مثال ${spec.chipShort} على البوردة` : `Loaded ${spec.chipShort} example on board`,
      'success'
    );
    if (soundEnabled) playSlideClick(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ic-inspector-title"
      onClick={() => setInspectedIcType(null)}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-2.5 backdrop-blur-sm sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/85 bg-slate-900/96 text-slate-100 shadow-2xl"
      >
        {/* Top Modal Header + 6-IC Quick Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/75 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
            <h2 id="ic-inspector-title" className="text-sm font-bold text-white sm:text-base">
              {spec.partNumber} • {spec.title[lang]}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTeachingLang(isAr ? 'en' : 'ar')}
              className="cursor-pointer rounded-lg border border-sky-400/60 bg-sky-500/20 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition-colors hover:bg-sky-500/35"
            >
              {isAr ? 'EN' : 'عربي'}
            </button>
            <button
              type="button"
              aria-label="Close IC Inspector"
              onClick={() => setInspectedIcType(null)}
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>

        {/* 6-IC Selector Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2">
          {IC_ORDER.map((id: ActiveGateModuleType) => {
            const d = IC_DATASHEETS[id];
            const active = id === inspectedIcType;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setInspectedIcType(id)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'border-sky-400 bg-sky-500/25 text-white shadow-sm'
                    : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                {d.chipShort} {d.gateName}
              </button>
            );
          })}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-3.5 sm:p-4">
          {/* Interactive DIP-14 Internal X-Ray Schematic (always LTR) */}
          <div className="rounded-xl border border-slate-700/80 bg-[#050b16] p-2.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-300">
              <span className="font-semibold text-sky-300">
                {isAr
                  ? 'المخطط الداخلي للشريحة (DIP-14 Internal Gate Connections)'
                  : 'DIP-14 Internal Gate Connections (Live Signal X-Ray)'}
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> VCC (+5V)
                </span>
                <span className="flex items-center gap-1 text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-400" /> GND (0V)
                </span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live HIGH (1)
                </span>
                <span className="flex items-center gap-1 text-red-300">
                  <span className="h-2 w-2 rounded-full bg-red-400" /> Live LOW (0)
                </span>
              </div>
            </div>

            <div dir="ltr" className="overflow-x-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 280"
                className="mx-auto h-auto w-full min-w-[460px] max-w-[620px] select-none font-sans"
              >
                <defs>
                  <clipPath id="ic-body-clip">
                    <rect x="56" y="58" width="528" height="164" rx="10" />
                  </clipPath>
                </defs>

                {/* DIP-14 Matte Package Body */}
                <rect
                  x="56"
                  y="58"
                  width="528"
                  height="164"
                  rx="10"
                  fill="#0c1524"
                  stroke="#334155"
                  strokeWidth="2"
                />

                {/* Left Pin-1 Orientation Notch & Dimple */}
                <path
                  d="M 56 122 A 18 18 0 0 1 56 158 Z"
                  fill="#050b16"
                  stroke="#334155"
                  strokeWidth="1.8"
                />
                <circle cx="78" cy="202" r="5" fill="#1e293b" stroke="#475569" strokeWidth="1" />

                {/* Subtle center chip watermark */}
                <text
                  x="320"
                  y="144"
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.14)"
                  fontSize="16"
                  fontWeight="800"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {spec.partNumber}
                </text>

                {/* All 14 Pins (1..7 Bottom, 14..8 Top) */}
                {Array.from({ length: 14 }, (_, idx) => {
                  const pinNum = idx + 1;
                  const { x, edgeY, isTop } = pinCoords(pinNum);
                  const sig = getPinSignal(pinNum);
                  const col = signalColor(sig);
                  const pinBoxY = isTop ? edgeY - 22 : edgeY;
                  const textY = isTop ? 19 : 265;

                  return (
                    <g key={pinNum}>
                      <rect
                        x={x - 10}
                        y={pinBoxY}
                        width="20"
                        height="22"
                        rx="3"
                        fill="#1e293b"
                        stroke={col}
                        strokeWidth={sig === 'HIGH' || sig === 'CONFLICT' ? '2' : '1.4'}
                      />
                      <text
                        x={x}
                        y={isTop ? edgeY - 7 : edgeY + 15}
                        textAnchor="middle"
                        fill={col}
                        fontSize="11"
                        fontWeight="800"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {pinNum}
                      </text>
                      <text
                        x={x}
                        y={textY}
                        textAnchor="middle"
                        fill={col}
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {pinNum === 14
                          ? 'VCC'
                          : pinNum === 7
                            ? 'GND'
                            : sig === 'HIGH'
                              ? '1'
                              : sig === 'LOW'
                                ? '0'
                                : sig === 'CONFLICT'
                                  ? '!'
                                  : `P${pinNum}`}
                      </text>
                    </g>
                  );
                })}

                {/* Internal Gates & Orthogonal Connections Inside Chip */}
                <g clipPath="url(#ic-body-clip)">
                  {placements.map((gp) => {
                    const outPin = gp.paths.find((p) => p.isOut)?.pinNumber ?? 0;
                    const outSig = getPinSignal(outPin);
                    const outCol = signalColor(outSig, !gp.exposedOnBoard);

                    return (
                      <g key={gp.gateIndex}>
                        {gp.paths.map((p) => {
                          const pSig = getPinSignal(p.pinNumber);
                          const pCol = signalColor(pSig, !gp.exposedOnBoard);
                          return (
                            <path
                              key={p.pinNumber}
                              d={p.d}
                              fill="none"
                              stroke={pCol}
                              strokeWidth={pSig === 'HIGH' || pSig === 'LOW' ? '2.2' : '1.5'}
                              strokeDasharray={!gp.exposedOnBoard ? '4 3' : undefined}
                              strokeLinejoin="round"
                            />
                          );
                        })}

                        <MiniGateSvg
                          gateName={spec.gateName}
                          cx={gp.cx}
                          cy={gp.cy}
                          facing={gp.facing}
                          dimmed={!gp.exposedOnBoard}
                          outStroke={outCol}
                        />
                        <text
                          x={gp.cx - (gp.facing === 'right' ? 3 : -3)}
                          y={gp.cy + 3.5}
                          textAnchor="middle"
                          fill={gp.exposedOnBoard ? '#e2e8f0' : '#64748b'}
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          G{gp.gateIndex}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          {/* Equation & Summary + Wiring Note (Bilingual EN/AR) */}
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">
                  {isAr ? 'المعادلة المنطقية (Boolean Equation)' : 'Boolean Equation'}
                </div>
                <div className="mt-0.5 flex items-center gap-3">
                  <EquationDisplay parts={spec.equationParts} />
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoadExample}
                className="cursor-pointer rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/30"
              >
                {isAr ? `وصّل مثال ${spec.chipShort} على البوردة` : `Wire ${spec.chipShort} Example on Board`}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-200">{spec.summary[lang]}</p>

            <div className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-[11px] leading-relaxed text-sky-100">
              <strong className="text-sky-300">
                {isAr ? 'ملاحظة التوصيل على bCube:' : 'bCube Hardware & Wiring Note:'}
              </strong>{' '}
              {spec.wiringNote[lang]}
            </div>
          </div>

          {/* Lower 2-Column Info Grid: Truth Table & Specs | Live Board Wiring */}
          <div dir={isAr ? 'rtl' : 'ltr'} className="grid gap-3 md:grid-cols-2">
            {/* Truth Table + Chip Specs */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <h3 className="text-xs font-bold text-slate-200">
                {isAr ? 'جدول الحقيقة والبيانات الفنية' : 'Truth Table & Datasheet Specs'}
              </h3>

              <div dir="ltr" className="overflow-hidden rounded-lg border border-slate-800">
                <table className="w-full border-collapse text-center font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-sky-300">
                      {spec.truthTable.inputLabels.map((lbl) => (
                        <th key={lbl} className="px-2 py-1.5">
                          {lbl}
                        </th>
                      ))}
                      <th className="border-l border-slate-800 px-2 py-1.5 text-emerald-300">Y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spec.truthTable.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-800/60 last:border-none">
                        {row.inputs.map((b, bIdx) => (
                          <td key={bIdx} className="px-2 py-1 text-slate-300">
                            {b}
                          </td>
                        ))}
                        <td
                          className={`border-l border-slate-800/60 px-2 py-1 font-bold ${
                            row.output === 1 ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {row.output}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                <div className="rounded-lg bg-slate-900/90 px-2.5 py-1.5">
                  <span className="text-slate-400">{isAr ? 'العائلة:' : 'Family:'}</span>{' '}
                  <strong dir="ltr">{spec.specs.family}</strong>
                </div>
                <div className="rounded-lg bg-slate-900/90 px-2.5 py-1.5">
                  <span className="text-slate-400">{isAr ? 'الغلاف:' : 'Package:'}</span>{' '}
                  <strong dir="ltr">{spec.specs.package}</strong>
                </div>
                <div className="rounded-lg bg-slate-900/90 px-2.5 py-1.5">
                  <span className="text-slate-400">{isAr ? 'الجهد:' : 'Supply:'}</span>{' '}
                  <strong dir="ltr">{spec.specs.supply}</strong>
                </div>
                <div className="rounded-lg bg-slate-900/90 px-2.5 py-1.5">
                  <span className="text-slate-400">{isAr ? 'البوابات:' : 'Gates:'}</span>{' '}
                  <strong>
                    {spec.specs.exposedOnBoard} / {spec.specs.totalGatesInside}
                  </strong>
                </div>
              </div>
            </div>

            {/* Live Wiring Attached to This IC Right Now */}
            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200">
                  {isAr ? 'الأسلاك الموصلة حالياً على هذه الشريحة' : 'Current Board Wiring on This IC'}
                </h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                  {wireSummary.length}
                </span>
              </div>

              {wireSummary.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-400">
                  {isAr
                    ? 'لا توجد أسلاك موصلة بهذه الشريحة حالياً. اضغط على زر المثال بالأعلى لتوصيلها فوراً.'
                    : 'No jumper wires are currently connected to this IC. Click the Example button above to wire one!'}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {wireSummary.map((conn) => {
                    const sigBadge =
                      conn.signal === 'HIGH'
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                        : conn.signal === 'LOW'
                          ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
                          : conn.signal === 'CONFLICT'
                            ? 'border-amber-400/70 bg-amber-500/25 text-amber-200'
                            : 'border-slate-600/70 bg-slate-800 text-slate-300';

                    return (
                      <div
                        key={`${conn.wireId}-${conn.pinNumber}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="min-w-0">
                          <div dir="ltr" className="font-mono font-bold text-slate-100">
                            Pin {conn.pinNumber}{' '}
                            <span className="font-sans text-[10px] font-medium text-sky-300">
                              ({conn.pinRole})
                            </span>
                          </div>
                          <div dir="ltr" className="truncate text-[10px] text-slate-400">
                            ↔ {conn.remoteLabel}
                          </div>
                        </div>
                        <span
                          dir="ltr"
                          className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${sigBadge}`}
                        >
                          {conn.signal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
