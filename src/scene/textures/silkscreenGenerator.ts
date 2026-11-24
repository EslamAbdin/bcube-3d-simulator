/* =========================================================================
   bCube Procedural Vector Silkscreen & Display CanvasTexture Generator
   Zero external assets — crisp high-DPI Canvas2D textures for R3F meshes.
   ========================================================================= */

import { useEffect, useMemo, type DependencyList } from 'react';
import * as THREE from 'three';
import {
  ALL_MODULES,
  BOARD_DIMENSIONS,
  BUTTON_SWITCHES,
  LED_INDICATORS,
  SLIDE_SWITCHES,
  type ActiveGateModuleType,
  type BoardModuleSpec,
} from '../../schema/boardSchema';

function finalizeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * React 19 StrictMode-safe CanvasTexture hook:
 * marks needsUpdate on mount and disposes GPU resources on unmount.
 */
export function useCanvasTexture(
  factory: () => THREE.CanvasTexture,
  deps: DependencyList
): THREE.CanvasTexture {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const texture = useMemo(factory, deps);

  useEffect(() => {
    texture.needsUpdate = true;
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return texture;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain 2D canvas context for silkscreen texture.');
  }
  return [canvas, ctx];
}

function makeMapper(cx: number, cz: number, worldW: number, worldD: number, cw: number, ch: number) {
  const toPx = (wx: number) => ((wx - (cx - worldW / 2)) / worldW) * cw;
  const toPy = (wz: number) => ((wz - (cz - worldD / 2)) / worldD) * ch;
  const scaleX = (w: number) => (w / worldW) * cw;
  const scaleY = (d: number) => (d / worldD) * ch;
  return { toPx, toPy, scaleX, scaleY };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

const PERIMETER_TITLES: Record<string, string> = {
  DIP_SWITCH: 'DIP SWITCH',
  SLIDE_SWITCH: 'SLIDE SWITCH',
  BUTTON_SWITCH: 'BUTTON SWITCH',
  WAVEFORM_GEN: 'WAVEFORM GENERATOR',
  PULL_UP_TOP: 'PULL UP RESISTOR',
  PULL_DOWN_TOP: 'PULL DOWN RESISTOR',
  PULL_UP_BOTTOM: 'PULL UP RESISTOR',
  PULL_DOWN_BOTTOM: 'PULL DOWN RESISTOR',
  VOLTAGE_CONTROL: 'VOLTAGE CONTROL',
  SPEAKER: 'SPEAKER',
  SEVEN_SEG_ANODE: '7-SEGMENT (Anode Common)',
  LED_RED: 'LED (Red)',
  SEVEN_SEG_CATHODE: '7-SEGMENT (Cathode Common)',
  LED_BLUE: 'LED (Blue)',
  DAQ_INPUT: 'DAQ INPUT',
  FREQ_COUNTER: 'FREQUENCY COUNT',
  DAQ_OUTPUT: 'DAQ OUTPUT',
  OSC_INPUT: 'OSCILLOSCOPE INPUT',
  USB_PORTS: 'USB OSC / DAQ',
};

export function createMainBoardTexture(): THREE.CanvasTexture {
  const cw = 2048;
  const ch = 1350;
  const [canvas, ctx] = makeCanvas(cw, ch);
  const { toPx, toPy, scaleX, scaleY } = makeMapper(
    0,
    0,
    BOARD_DIMENSIONS.width,
    BOARD_DIMENSIONS.depth,
    cw,
    ch
  );

  // Solder-mask base
  ctx.fillStyle = BOARD_DIMENSIONS.solderMaskHex;
  ctx.fillRect(0, 0, cw, ch);

  // Subtle FR-4 micro-grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  const stepX = scaleX(1.0);
  const stepY = scaleY(1.0);
  for (let x = 0; x <= cw; x += stepX) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }
  for (let y = 0; y <= ch; y += stepY) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();
  }

  // Outer crisp white silkscreen frame
  const insetX = toPx(-BOARD_DIMENSIONS.width / 2 + 0.32);
  const insetY = toPy(-BOARD_DIMENSIONS.depth / 2 + 0.32);
  const frameW = scaleX(BOARD_DIMENSIONS.width - 0.64);
  const frameH = scaleY(BOARD_DIMENSIONS.depth - 0.64);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, insetX, insetY, frameW, frameH, 16);
  ctx.stroke();

  // Module outlines & section headers
  for (const mod of ALL_MODULES) {
    const x = toPx(mod.bounds.minX);
    const y = toPy(mod.bounds.minZ);
    const w = scaleX(mod.size.width);
    const h = scaleY(mod.size.depth);

    if (!mod.isDaughterModule) {
      ctx.fillStyle = mod.status === 'active' ? 'rgba(6, 48, 84, 0.30)' : 'rgba(5, 42, 72, 0.22)';
      drawRoundedRect(ctx, x, y, w, h, 10);
      ctx.fill();

      ctx.save();
      if (mod.status === 'standby') {
        ctx.setLineDash([10, 6]);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.68)';
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.2;
      }
      drawRoundedRect(ctx, x, y, w, h, 10);
      ctx.stroke();
      ctx.restore();

      const title = PERIMETER_TITLES[mod.id] ?? mod.shortLabel;
      ctx.fillStyle = mod.status === 'active' ? '#ffffff' : 'rgba(241, 245, 249, 0.88)';
      ctx.font = 'bold 17px ui-sans-serif, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, toPx(mod.position.x), toPy(mod.bounds.minZ + 0.34), w - 16);

      // Divider under section title
      ctx.strokeStyle =
        mod.status === 'active' ? 'rgba(255,255,255,0.65)' : 'rgba(226,232,240,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 10, toPy(mod.bounds.minZ + 0.62));
      ctx.lineTo(x + w - 10, toPy(mod.bounds.minZ + 0.62));
      ctx.stroke();

      // Specialized silkscreen ticks for rotary dials / USB controls
      if (mod.id === 'WAVEFORM_GEN') {
        const dialCenters = [
          { x: mod.position.x - 1.55, z: mod.position.z - 0.65, label: 'FREQ' },
          { x: mod.position.x + 0.35, z: mod.position.z - 0.65, label: 'DUTY' },
          { x: mod.position.x - 0.6, z: mod.position.z + 1.45, label: 'AMP' },
        ];
        for (const d of dialCenters) {
          const cxPx = toPx(d.x);
          const cyPx = toPy(d.z);
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = 2;
          for (let i = 0; i <= 8; i++) {
            const ang = (Math.PI * 0.75) + (i / 8) * (Math.PI * 1.5);
            ctx.beginPath();
            ctx.moveTo(cxPx + Math.cos(ang) * 24, cyPx + Math.sin(ang) * 24);
            ctx.lineTo(cxPx + Math.cos(ang) * 31, cyPx + Math.sin(ang) * 31);
            ctx.stroke();
          }
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
          ctx.fillText(d.label, cxPx, cyPx + 38);
        }
      } else if (mod.id === 'VOLTAGE_CONTROL') {
        const knobs = [
          { x: mod.position.x - 1.65, z: mod.position.z + 0.2, label: '0V — 5V A' },
          { x: mod.position.x + 0.55, z: mod.position.z + 0.2, label: '0V — 5V B' },
        ];
        for (const k of knobs) {
          const cxPx = toPx(k.x);
          const cyPx = toPy(k.z);
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = 2;
          for (let i = 0; i <= 10; i++) {
            const ang = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
            ctx.beginPath();
            ctx.moveTo(cxPx + Math.cos(ang) * 26, cyPx + Math.sin(ang) * 26);
            ctx.lineTo(cxPx + Math.cos(ang) * 33, cyPx + Math.sin(ang) * 33);
            ctx.stroke();
          }
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
          ctx.fillText(k.label, cxPx, cyPx + 42);
        }
      } else if (mod.id === 'USB_PORTS') {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('USB SCOPE', toPx(mod.position.x - 1.45), toPy(mod.position.z + 0.9));
        ctx.fillText('USB DAQ', toPx(mod.position.x + 1.15), toPy(mod.position.z + 0.9));
        ctx.fillText('RESET', toPx(mod.position.x - 1.45), toPy(mod.position.z + 1.98));
        ctx.fillText('PWR +5V', toPx(mod.position.x + 1.15), toPy(mod.position.z + 1.98));
      }
    } else {
      // Base PCB slot outline & 4 corner solder pads underneath center daughter PCBs
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, x, y, w, h, 8);
      ctx.stroke();
      ctx.restore();

      const dx = mod.size.width / 2 - 0.28;
      const dz = mod.size.depth / 2 - 0.28;
      for (const sx of [-dx, dx]) {
        for (const sz of [-dz, dz]) {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(toPx(mod.position.x + sx), toPy(mod.position.z + sz), 6.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // Slide Switch labels (SW1..SW16) + header pin markers
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const sw of SLIDE_SWITCHES) {
    const sx = toPx(sw.position.x);
    const sz = toPy(sw.position.z);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(sw.id, sx, toPy(sw.position.z + 0.98));
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('ON', sx, sz - scaleY(0.71));
    ctx.fillText('OFF', sx, sz + scaleY(0.71));

    // Pin index label next to header row
    const hdrX = -18.0 + 2.45;
    const hdrZ = -4.2 - 4.8 + sw.row * 2.75 + sw.col * 0.44;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(sw.index), toPx(hdrX - 0.36), toPy(hdrZ));
    ctx.textAlign = 'center';
  }

  // Button Switch labels (BTN1..BTN4) + header pin markers
  for (const btn of BUTTON_SWITCHES) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(btn.id, toPx(btn.position.x), toPy(btn.position.z + 0.72));

    const hdrX = -18.0 + 2.45;
    const hdrZ = 4.6 - 0.85 + (btn.index - 1) * 0.56;
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`B${btn.index}`, toPx(hdrX - 0.38), toPy(hdrZ));
    ctx.textAlign = 'center';
  }

  // LED labels (D1..D8) + header pin markers
  for (const led of LED_INDICATORS) {
    const shortName = `D${led.index}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(shortName, toPx(led.position.x), toPy(led.position.z + 0.48));

    const bankCenterZ = led.bank === 'red' ? -5.7 : 5.5;
    const hdrX = 18.1 - 2.45;
    const hdrZ = bankCenterZ - 1.75 + (led.index - 1) * 0.5;
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(shortName, toPx(hdrX + 0.38), toPy(hdrZ));
    ctx.textAlign = 'center';
  }

  // Bottom branding rail (cleanly interrupts outer white border)
  const brandY = toPy(14.16);
  ctx.fillStyle = BOARD_DIMENSIONS.solderMaskHex;
  ctx.fillRect(toPx(-3.05), brandY - 14, scaleX(6.35), 28);

  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, toPx(-2.8), brandY - 12, scaleX(2.0), 24, 6);
  ctx.fill();
  ctx.fillStyle = BOARD_DIMENSIONS.solderMaskHex;
  ctx.font = 'bold 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('bCube', toPx(-1.8), brandY + 1);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Digital Logic Circuit', toPx(-0.55), brandY + 1);

  return finalizeTexture(canvas);
}

const ACTIVE_GATE_TITLES: Record<ActiveGateModuleType, string> = {
  IC_7404: 'NOT 7404',
  IC_7408: 'AND 7408',
  IC_7432: 'OR 7432',
  IC_7400: 'NAND 7400',
  IC_7402: 'NOR 7402',
  IC_7486: 'XOR 7486',
};

function drawIeeeGateSymbol(
  ctx: CanvasRenderingContext2D,
  type: ActiveGateModuleType,
  cy: number,
  toPx: (lx: number) => number,
  toPy: (lz: number) => number,
  scaleX: (w: number) => number
) {
  const halfH = 0.29;
  const topY = toPy(cy - halfH);
  const botY = toPy(cy + halfH);
  const midY = toPy(cy);

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'IC_7404') {
    const leftX = toPx(-0.5);
    const tipX = toPx(0.4);
    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    ctx.lineTo(tipX, midY);
    ctx.lineTo(leftX, botY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inversion bubble
    const r = scaleX(0.11);
    ctx.beginPath();
    ctx.arc(toPx(0.52), midY, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0f79bd';
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (type === 'IC_7408' || type === 'IC_7400') {
    const hasBubble = type === 'IC_7400';
    const backX = toPx(hasBubble ? -0.58 : -0.54);
    const arcCx = toPx(hasBubble ? 0.08 : 0.14);
    const radius = (botY - topY) / 2;

    ctx.beginPath();
    ctx.moveTo(backX, topY);
    ctx.lineTo(arcCx, topY);
    ctx.arc(arcCx, midY, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(backX, botY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (hasBubble) {
      const r = scaleX(0.11);
      ctx.beginPath();
      ctx.arc(toPx(0.49), midY, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0f79bd';
      ctx.fill();
      ctx.stroke();
    }
    return;
  }

  // OR / NOR / XOR curved body
  const hasBubble = type === 'IC_7402';
  const hasXorArc = type === 'IC_7486';
  const backX = toPx(hasXorArc ? -0.44 : hasBubble ? -0.6 : -0.56);
  const backCtrlX = toPx(hasXorArc ? -0.18 : hasBubble ? -0.32 : -0.28);
  const noseX = toPx(hasXorArc ? 0.56 : hasBubble ? 0.4 : 0.52);
  const bodyCtrlX = toPx(hasXorArc ? 0.22 : hasBubble ? 0.08 : 0.18);

  if (hasXorArc) {
    ctx.beginPath();
    ctx.moveTo(toPx(-0.62), topY);
    ctx.quadraticCurveTo(toPx(-0.36), midY, toPx(-0.62), botY);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(backX, topY);
  ctx.quadraticCurveTo(bodyCtrlX, topY, noseX, midY);
  ctx.quadraticCurveTo(bodyCtrlX, botY, backX, botY);
  ctx.quadraticCurveTo(backCtrlX, midY, backX, topY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (hasBubble) {
    const r = scaleX(0.11);
    ctx.beginPath();
    ctx.arc(toPx(0.52), midY, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0f79bd';
    ctx.fill();
    ctx.stroke();
  }
}

export function createActiveGateModuleTexture(mod: BoardModuleSpec): THREE.CanvasTexture {
  const cw = 512;
  const ch = 512;
  const [canvas, ctx] = makeCanvas(cw, ch);
  const { width, depth } = BOARD_DIMENSIONS.daughterModule;
  const { toPx, toPy, scaleX, scaleY } = makeMapper(0, 0, width, depth, cw, ch);

  const gType = mod.type as ActiveGateModuleType;
  const pcbBlue = '#0f79bd';

  // Background
  ctx.fillStyle = pcbBlue;
  ctx.fillRect(0, 0, cw, ch);

  // Outer white silkscreen border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, toPx(-width / 2 + 0.1), toPy(-depth / 2 + 0.1), scaleX(width - 0.2), scaleY(depth - 0.2), 10);
  ctx.stroke();

  // Corner mounting hole copper/gold rings
  for (const cx of [-width / 2 + 0.26, width / 2 - 0.26]) {
    for (const cz of [-depth / 2 + 0.26, depth / 2 - 0.26]) {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(toPx(cx), toPy(cz), 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Title banner
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px ui-sans-serif, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ACTIVE_GATE_TITLES[gType], toPx(0), toPy(-2.03));

  // Header divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(toPx(-2.38), toPy(-1.78));
  ctx.lineTo(toPx(2.38), toPy(-1.78));
  ctx.stroke();

  // Pin layout constants matching boardSchema.ts
  const isNot = gType === 'IC_7404';
  const leftStepZ = isNot ? 0.88 : 0.44;
  const leftStartZ = isNot ? -1.32 : -1.54;
  const rightStartZ = -1.32;
  const rightStepZ = 0.88;

  // Determine trace X termination to cleanly touch each gate body
  let inputTraceEndX = -0.54;
  let outputTraceStartX = 0.43;
  if (gType === 'IC_7404') {
    inputTraceEndX = -0.5;
    outputTraceStartX = 0.63;
  } else if (gType === 'IC_7400') {
    inputTraceEndX = -0.58;
    outputTraceStartX = 0.6;
  } else if (gType === 'IC_7432') {
    inputTraceEndX = -0.46;
    outputTraceStartX = 0.52;
  } else if (gType === 'IC_7402') {
    inputTraceEndX = -0.49;
    outputTraceStartX = 0.63;
  } else if (gType === 'IC_7486') {
    inputTraceEndX = -0.55;
    outputTraceStartX = 0.56;
  }

  const gates = mod.gates ?? [];
  let leftCursor = 0;

  for (const gate of gates) {
    const cy = rightStartZ + (gate.gateIndex - 1) * rightStepZ;

    // Input traces & pin numbers
    for (const pinNum of gate.inputPins) {
      const pinZ = leftStartZ + leftCursor * leftStepZ;
      leftCursor++;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(toPx(-1.75), toPy(pinZ));
      ctx.lineTo(toPx(inputTraceEndX), toPy(pinZ));
      ctx.stroke();

      // Pin number with solid PCB blue halo so trace never obscures digits
      ctx.font = 'bold 21px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = pcbBlue;
      ctx.lineWidth = 7;
      ctx.strokeText(String(pinNum), toPx(-1.35), toPy(pinZ));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(pinNum), toPx(-1.35), toPy(pinZ));
    }

    // Output trace & pin number
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toPx(outputTraceStartX), toPy(cy));
    ctx.lineTo(toPx(1.75), toPy(cy));
    ctx.stroke();

    ctx.font = 'bold 21px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = pcbBlue;
    ctx.lineWidth = 7;
    ctx.strokeText(String(gate.outputPin), toPx(1.35), toPy(cy));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(gate.outputPin), toPx(1.35), toPy(cy));

    // IEEE gate symbol
    drawIeeeGateSymbol(ctx, gType, cy, toPx, toPy, scaleX);
  }

  // Bottom DIP-14 IC silkscreen outline (seated clear below Gate 4)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(toPx(-0.86), toPy(1.73), scaleX(1.72), scaleY(0.56));
  ctx.beginPath();
  ctx.arc(toPx(-0.86), toPy(2.01), scaleX(0.09), -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  return finalizeTexture(canvas);
}

export function createStandbyModuleTexture(mod: BoardModuleSpec): THREE.CanvasTexture {
  const cw = 256;
  const ch = 256;
  const [canvas, ctx] = makeCanvas(cw, ch);
  const { width, depth } = BOARD_DIMENSIONS.daughterModule;
  const { toPx, toPy, scaleX, scaleY } = makeMapper(0, 0, width, depth, cw, ch);

  // Cooler muted solder-mask blue to visually distinguish standby modules
  ctx.fillStyle = '#0b5b8c';
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, toPx(-width / 2 + 0.12), toPy(-depth / 2 + 0.12), scaleX(width - 0.24), scaleY(depth - 0.24), 8);
  ctx.stroke();

  // Corner pads
  for (const cx of [-width / 2 + 0.26, width / 2 - 0.26]) {
    for (const cz of [-depth / 2 + 0.26, depth / 2 - 0.26]) {
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(toPx(cx), toPy(cz), 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Module header label
  ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
  ctx.font = 'bold 19px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mod.shortLabel, cw / 2, toPy(-1.95), cw - 24);

  // Subtle radial trace lines toward center IC footprint
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.32)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const lz = -1.25 + i * 0.55;
    ctx.beginPath();
    ctx.moveTo(toPx(-1.72), toPy(lz));
    ctx.lineTo(toPx(-0.55), toPy(lz * 0.55));
    ctx.moveTo(toPx(1.72), toPy(lz));
    ctx.lineTo(toPx(0.55), toPy(lz * 0.55));
    ctx.stroke();
  }

  // Muted STANDBY tag at bottom
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  drawRoundedRect(ctx, cw / 2 - 58, ch - 30, 116, 19, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
  ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('STANDBY (v2)', cw / 2, ch - 20);

  return finalizeTexture(canvas);
}

export function createIcTopTexture(code: string): THREE.CanvasTexture {
  const cw = 256;
  const ch = 64;
  const [canvas, ctx] = makeCanvas(cw, ch);

  ctx.fillStyle = '#1b1f26';
  ctx.fillRect(0, 0, cw, ch);

  // Pin 1 dimple dot
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(22, ch - 18, 7, 0, Math.PI * 2);
  ctx.fill();

  // Laser-etched IC part number
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, cw / 2 + 8, ch / 2, cw - 44);

  return finalizeTexture(canvas);
}

export function createSevenSegFaceTexture(digits: string, isLitRed: boolean): THREE.CanvasTexture {
  const cw = 256;
  const ch = 128;
  const [canvas, ctx] = makeCanvas(cw, ch);

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, cw - 4, ch - 4);

  // Draw clean 7-segment style digit shapes
  const chars = digits.replace(/\./g, '').split('');
  const dotAfter = new Set<number>();
  let cleanIdx = -1;
  for (const chItem of digits) {
    if (chItem === '.') {
      if (cleanIdx >= 0) dotAfter.add(cleanIdx);
    } else {
      cleanIdx++;
    }
  }

  const slotW = (cw - 24) / Math.max(chars.length, 1);
  const segColor = isLitRed ? '#ff3b30' : '#3a1a22';
  const dimColor = '#1b1620';

  const DIGIT_SEGMENTS: Record<string, string> = {
    '0': 'abcdef',
    '8': 'abcdefg',
  };

  chars.forEach((digit, idx) => {
    const active = DIGIT_SEGMENTS[digit] ?? 'abcdefg';
    const x0 = 16 + idx * slotW + 6;
    const w = slotW - 18;
    const y0 = 18;
    const h = ch - 36;
    const mid = y0 + h / 2;
    const thick = Math.max(5, Math.min(9, w * 0.18));

    const drawH = (y: number, on: boolean) => {
      ctx.fillStyle = on ? segColor : dimColor;
      ctx.fillRect(x0 + thick, y - thick / 2, w - thick * 2, thick);
    };
    const drawV = (x: number, yStart: number, yEnd: number, on: boolean) => {
      ctx.fillStyle = on ? segColor : dimColor;
      ctx.fillRect(x - thick / 2, yStart + thick / 2, thick, yEnd - yStart - thick);
    };

    drawH(y0, active.includes('a'));
    drawV(x0 + w - thick / 2, y0, mid, active.includes('b'));
    drawV(x0 + w - thick / 2, mid, y0 + h, active.includes('c'));
    drawH(y0 + h, active.includes('d'));
    drawV(x0 + thick / 2, mid, y0 + h, active.includes('e'));
    drawV(x0 + thick / 2, y0, mid, active.includes('f'));
    drawH(mid, active.includes('g'));

    if (dotAfter.has(idx)) {
      ctx.fillStyle = segColor;
      ctx.beginPath();
      ctx.arc(x0 + w + 3, y0 + h - 2, thick * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return finalizeTexture(canvas);
}
