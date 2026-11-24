/* =========================================================================
   bCube 3D Digital Logic Trainer — Single Source of Truth Board Schema
   Zero React or Three.js imports. Scale: 1 unit = 10 mm.
   ========================================================================= */

export type ModuleStatus = 'active' | 'standby';

export type ActiveGateModuleType =
  | 'IC_7404'
  | 'IC_7408'
  | 'IC_7432'
  | 'IC_7400'
  | 'IC_7402'
  | 'IC_7486';

export type ActiveModuleType =
  | 'SLIDE_SWITCH'
  | 'BUTTON_SWITCH'
  | 'LED_RED'
  | 'LED_BLUE'
  | ActiveGateModuleType;

export type StandbyModuleType =
  | 'DIP_SWITCH'
  | 'WAVEFORM_GEN'
  | 'PULL_UP_TOP'
  | 'PULL_DOWN_TOP'
  | 'PULL_UP_BOTTOM'
  | 'PULL_DOWN_BOTTOM'
  | 'VOLTAGE_CONTROL'
  | 'SPEAKER'
  | 'SEVEN_SEG_ANODE'
  | 'SEVEN_SEG_CATHODE'
  | 'DAQ_INPUT'
  | 'FREQ_COUNTER'
  | 'DAQ_OUTPUT'
  | 'OSC_INPUT'
  | 'USB_PORTS'
  | 'IC_7410'
  | 'IC_7420'
  | 'IC_7442'
  | 'IC_7447'
  | 'IC_7448'
  | 'IC_7473'
  | 'IC_7475'
  | 'IC_7483'
  | 'IC_7485'
  | 'IC_7490'
  | 'IC_74393'
  | 'NE555'
  | 'MV1'
  | 'MV2'
  | 'MV3';

export type ModuleType = ActiveModuleType | StandbyModuleType;

export type PinDirection = 'input' | 'output' | 'io_source';

export type HoleSide = 'A' | 'B';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PinHeaderRowSpec {
  pinNumber: number;
  role: string;
  direction: PinDirection;
  side: 'left' | 'right';
  rowIndex: number;
}

export interface GateInstanceSpec {
  gateIndex: number;
  inputPins: number[];
  outputPin: number;
}

export interface BoardModuleSpec {
  id: string;
  type: ModuleType;
  label: string;
  shortLabel: string;
  status: ModuleStatus;
  zone: 'left_io' | 'right_io' | 'top_rail' | 'bottom_rail' | 'center_grid';
  gridPos?: { row: number; col: number };
  position: Vec3;
  size: { width: number; depth: number; thickness: number };
  bounds: BoundingBox2D;
  isDaughterModule: boolean;
  gates?: GateInstanceSpec[];
}

export interface SocketSpec {
  id: string;
  nodeId: string;
  moduleId: string;
  moduleType: ActiveModuleType;
  pinKey: string;
  pinNumber?: number;
  hole: HoleSide;
  direction: PinDirection;
  position: Vec3;
  tooltip: string;
}

export interface SlideSwitchControlSpec {
  id: string; // SW1 .. SW16
  index: number;
  row: number;
  col: number;
  position: Vec3;
  nodeId: string;
  socketIds: [string, string];
}

export interface ButtonSwitchControlSpec {
  id: string; // BTN1 .. BTN4
  index: number;
  row: number;
  col: number;
  position: Vec3;
  nodeId: string;
  socketIds: [string, string];
}

export interface LedIndicatorSpec {
  id: string; // RED_D1..8, BLUE_D1..8
  bank: 'red' | 'blue';
  index: number;
  row: number;
  col: number;
  position: Vec3;
  nodeId: string;
  socketIds: [string, string];
}

export const BOARD_DIMENSIONS = {
  width: 44.0, // 440mm
  depth: 29.0, // 290mm
  thickness: 0.4, // 4mm
  topY: 0.0,
  solderMaskHex: '#0d6eab',
  daughterModule: {
    width: 5.2,
    depth: 4.8,
    thickness: 0.15,
    standoffBottomY: 0.0,
    pcbBottomY: 0.05,
    pcbTopY: 0.2,
    silkscreenY: 0.204,
    headerTopY: 0.42,
  },
  baseBoardHeaderTopY: 0.22,
  dualHolePitch: 0.254, // 2.54mm
} as const;

function makeBounds(cx: number, cz: number, w: number, d: number): BoundingBox2D {
  return {
    minX: Number((cx - w / 2).toFixed(4)),
    maxX: Number((cx + w / 2).toFixed(4)),
    minZ: Number((cz - d / 2).toFixed(4)),
    maxZ: Number((cz + d / 2).toFixed(4)),
  };
}

function makeBaseModule(
  id: string,
  type: ModuleType,
  label: string,
  shortLabel: string,
  status: ModuleStatus,
  zone: BoardModuleSpec['zone'],
  cx: number,
  cz: number,
  w: number,
  d: number,
  thickness = 0.12
): BoardModuleSpec {
  return {
    id,
    type,
    label,
    shortLabel,
    status,
    zone,
    position: { x: cx, y: BOARD_DIMENSIONS.topY, z: cz },
    size: { width: w, depth: d, thickness },
    bounds: makeBounds(cx, cz, w, d),
    isDaughterModule: false,
  };
}

function makeCenterModule(
  row: number,
  col: number,
  id: string,
  type: ModuleType,
  label: string,
  shortLabel: string,
  status: ModuleStatus,
  gates?: GateInstanceSpec[]
): BoardModuleSpec {
  const colCentersX = [-11.3, -5.65, 0.0, 5.65, 11.3];
  const rowCentersZ = [-7.575, -2.525, 2.525, 7.575];
  const cx = colCentersX[col];
  const cz = rowCentersZ[row];
  const { width, depth, thickness, pcbBottomY } = BOARD_DIMENSIONS.daughterModule;
  return {
    id,
    type,
    label,
    shortLabel,
    status,
    zone: 'center_grid',
    gridPos: { row, col },
    position: { x: cx, y: pcbBottomY, z: cz },
    size: { width, depth, thickness },
    bounds: makeBounds(cx, cz, width, depth),
    isDaughterModule: true,
    gates,
  };
}

function makeFixedCol0Module(
  row: number,
  id: string,
  type: ActiveGateModuleType,
  label: string,
  shortLabel: string,
  gates: GateInstanceSpec[]
): BoardModuleSpec {
  const cx = -11.3;
  const rowCentersZ = [-8.38, -4.14, 0.1, 4.34, 8.58];
  const cz = rowCentersZ[row];
  const width = 5.2;
  const depth = 3.92;
  return {
    id,
    type,
    label,
    shortLabel,
    status: 'active',
    zone: 'center_grid',
    gridPos: { row, col: 0 },
    position: { x: cx, y: BOARD_DIMENSIONS.topY, z: cz },
    size: { width, depth, thickness: 0.01 },
    bounds: makeBounds(cx, cz, width, depth),
    isDaughterModule: false,
    gates,
  };
}

export interface GateModuleLayout {
  surfaceY: number;
  headerTopY: number;
  icLocalZ: number;
  icWidth: number;
  leftStartZ: number;
  leftStepZ: number;
  rightStartZ: number;
  rightStepZ: number;
  gateHalfH: number;
  pinLabelOffsetZ: number;
}

/** Shared layout metrics so sockets, silkscreen, 3D chips, and SMD overlays align 1:1. */
export function getGateModuleLayout(mod: BoardModuleSpec): GateModuleLayout {
  const isNot = mod.type === 'IC_7404';
  if (mod.isDaughterModule) {
    return {
      surfaceY: BOARD_DIMENSIONS.daughterModule.silkscreenY,
      headerTopY: BOARD_DIMENSIONS.daughterModule.headerTopY,
      icLocalZ: -1.56,
      icWidth: 0.44,
      leftStartZ: isNot ? -0.58 : -0.76,
      leftStepZ: isNot ? 0.72 : 0.36,
      rightStartZ: -0.58,
      rightStepZ: 0.72,
      gateHalfH: 0.235,
      pinLabelOffsetZ: -0.15,
    };
  }
  return {
    surfaceY: 0.008,
    headerTopY: BOARD_DIMENSIONS.baseBoardHeaderTopY,
    icLocalZ: -1.32,
    icWidth: 0.42,
    leftStartZ: isNot ? -0.465 : -0.62,
    leftStepZ: isNot ? 0.62 : 0.31,
    rightStartZ: -0.465,
    rightStepZ: 0.62,
    gateHalfH: 0.205,
    pinLabelOffsetZ: -0.13,
  };
}

// =========================================================================
// PERIMETER I/O & UTILITY MODULES
// =========================================================================
const PERIMETER_MODULES: BoardModuleSpec[] = [
  // Left Input Column (x = -18.0, bounds inside [-21.2, -14.8])
  makeBaseModule('DIP_SWITCH', 'DIP_SWITCH', 'DIP Switch (2×4)', 'DIP SW', 'standby', 'left_io', -18.0, -12.0, 6.2, 3.6),
  makeBaseModule('SLIDE_SWITCH', 'SLIDE_SWITCH', 'Slide Switches (SW1–SW16)', 'SW1–16', 'active', 'left_io', -18.0, -4.2, 6.4, 11.2),
  makeBaseModule('BUTTON_SWITCH', 'BUTTON_SWITCH', 'Push Buttons (BTN1–BTN4)', 'BTN1–4', 'active', 'left_io', -18.0, 4.6, 6.4, 5.2),
  makeBaseModule('WAVEFORM_GEN', 'WAVEFORM_GEN', 'Waveform Generator & Duty Control', 'WAVE GEN', 'standby', 'left_io', -18.0, 10.8, 6.4, 6.0),

  // Top Rail (z = -12.2, spanning [-13.6, +13.5])
  makeBaseModule('PULL_UP_TOP', 'PULL_UP_TOP', 'Pull-Up Resistors (Top)', 'PULL UP', 'standby', 'top_rail', -10.8, -12.2, 5.6, 3.2),
  makeBaseModule('PULL_DOWN_TOP', 'PULL_DOWN_TOP', 'Pull-Down Resistors (Top)', 'PULL DN', 'standby', 'top_rail', -4.2, -12.2, 6.4, 3.2),
  makeBaseModule('VOLTAGE_CONTROL', 'VOLTAGE_CONTROL', 'Variable Voltage Control', 'VOLT ADJ', 'standby', 'top_rail', 3.2, -12.2, 6.8, 3.2),
  makeBaseModule('SPEAKER', 'SPEAKER', 'Buzzer / Audio Speaker', 'SPEAKER', 'standby', 'top_rail', 10.4, -12.2, 6.2, 3.2),

  // Bottom Rail (z = +12.3, spanning [-14.0, +14.1])
  makeBaseModule('DAQ_INPUT', 'DAQ_INPUT', '8-Bit DAQ Input Header', 'DAQ IN', 'standby', 'bottom_rail', -12.2, 12.3, 3.6, 3.0),
  makeBaseModule('FREQ_COUNTER', 'FREQ_COUNTER', '4-Digit Frequency Counter', 'FREQ CNT', 'standby', 'bottom_rail', -7.0, 12.3, 5.8, 3.0),
  makeBaseModule('PULL_UP_BOTTOM', 'PULL_UP_BOTTOM', 'Pull-Up Resistors (Bottom)', 'PULL UP', 'standby', 'bottom_rail', -1.2, 12.3, 4.6, 3.0),
  makeBaseModule('PULL_DOWN_BOTTOM', 'PULL_DOWN_BOTTOM', 'Pull-Down Resistors (Bottom)', 'PULL DN', 'standby', 'bottom_rail', 4.0, 12.3, 4.6, 3.0),
  makeBaseModule('DAQ_OUTPUT', 'DAQ_OUTPUT', '8-Bit DAQ Output Header', 'DAQ OUT', 'standby', 'bottom_rail', 9.0, 12.3, 4.2, 3.0),
  makeBaseModule('OSC_INPUT', 'OSC_INPUT', 'Oscilloscope BNC Input', 'SCOPE IN', 'standby', 'bottom_rail', 12.8, 12.3, 2.6, 3.0),

  // Right Output Column (x = +18.1, bounds inside [+14.9, +21.3])
  makeBaseModule('SEVEN_SEG_ANODE', 'SEVEN_SEG_ANODE', '2× 7-Segment (Common Anode)', '7-SEG CA', 'standby', 'right_io', 18.1, -11.3, 6.4, 4.8),
  makeBaseModule('LED_RED', 'LED_RED', 'Red LED Bank (D1–D8)', 'RED LEDs', 'active', 'right_io', 18.1, -5.7, 6.4, 5.6),
  makeBaseModule('SEVEN_SEG_CATHODE', 'SEVEN_SEG_CATHODE', '2× 7-Segment (Common Cathode)', '7-SEG CC', 'standby', 'right_io', 18.1, -0.1, 6.4, 4.8),
  makeBaseModule('LED_BLUE', 'LED_BLUE', 'Blue LED Bank (D1–D8)', 'BLUE LEDs', 'active', 'right_io', 18.1, 5.5, 6.4, 5.6),
  makeBaseModule('USB_PORTS', 'USB_PORTS', 'USB Oscilloscope & USB DAQ Ports', 'USB / DAQ', 'standby', 'right_io', 18.1, 11.3, 6.4, 4.8),
];

// =========================================================================
// CENTER 4×5 GRID = 20 MODULE SLOTS
// =========================================================================
const STANDARD_2IN_GATES: GateInstanceSpec[] = [
  { gateIndex: 1, inputPins: [1, 2], outputPin: 3 },
  { gateIndex: 2, inputPins: [4, 5], outputPin: 6 },
  { gateIndex: 3, inputPins: [9, 10], outputPin: 8 },
  { gateIndex: 4, inputPins: [12, 13], outputPin: 11 },
];

const NOR_7402_GATES: GateInstanceSpec[] = [
  { gateIndex: 1, inputPins: [2, 3], outputPin: 1 },
  { gateIndex: 2, inputPins: [5, 6], outputPin: 4 },
  { gateIndex: 3, inputPins: [8, 9], outputPin: 10 },
  { gateIndex: 4, inputPins: [11, 12], outputPin: 13 },
];

const NOT_7404_GATES: GateInstanceSpec[] = [
  { gateIndex: 1, inputPins: [1], outputPin: 2 },
  { gateIndex: 2, inputPins: [3], outputPin: 4 },
  { gateIndex: 3, inputPins: [5], outputPin: 6 },
  { gateIndex: 4, inputPins: [9], outputPin: 8 },
];

const CENTER_MODULES: BoardModuleSpec[] = [
  // Column 0 — 5 Fixed Built-In Logic Gate Blocks on Main PCB (top-to-bottom: NAND, AND, OR, NOR, NOT)
  makeFixedCol0Module(0, 'IC_7400', 'IC_7400', '7400 Quad 2-Input NAND', '7400 NAND', STANDARD_2IN_GATES),
  makeFixedCol0Module(1, 'IC_7408', 'IC_7408', '7408 Quad 2-Input AND', '7408 AND', STANDARD_2IN_GATES),
  makeFixedCol0Module(2, 'IC_7432', 'IC_7432', '7432 Quad 2-Input OR', '7432 OR', STANDARD_2IN_GATES),
  makeFixedCol0Module(3, 'IC_7402', 'IC_7402', '7402 Quad 2-Input NOR', '7402 NOR', NOR_7402_GATES),
  makeFixedCol0Module(4, 'IC_7404', 'IC_7404', '7404 Hex Inverter (4 Gates)', '7404 NOT', NOT_7404_GATES),

  // Column 1 — 4 Daughter Slots vertically (XOR 7486 in 3rd/second-to-last slot)
  makeCenterModule(0, 1, 'IC_7410', 'IC_7410', '7410 Triple 3-Input NAND', '7410 3-NAND', 'standby'),
  makeCenterModule(1, 1, 'IC_7420', 'IC_7420', '7420 Dual 4-Input NAND', '7420 4-NAND', 'standby'),
  makeCenterModule(2, 1, 'IC_7486', 'IC_7486', '7486 Quad 2-Input XOR', '7486 XOR', 'active', STANDARD_2IN_GATES),
  makeCenterModule(3, 1, 'MV1', 'MV1', 'Multi Vibrator 1 (Monostable)', 'MV 1', 'standby'),

  // Column 2 — 4 Daughter Slots (all standby)
  makeCenterModule(0, 2, 'IC_7490', 'IC_7490', '7490 Decade & Binary Counter', '7490 DECADE', 'standby'),
  makeCenterModule(1, 2, 'IC_7473', 'IC_7473', '7473 Dual J-K Flip-Flop', '7473 JK-FF', 'standby'),
  makeCenterModule(2, 2, 'NE555', 'NE555', 'NE555 Precision Timer', 'NE555 TIMER', 'standby'),
  makeCenterModule(3, 2, 'MV2', 'MV2', 'Multi Vibrator 2 (Astable)', 'MV 2', 'standby'),

  // Column 3 — 4 Daughter Slots (all standby)
  makeCenterModule(0, 3, 'IC_7442', 'IC_7442', '7442 BCD to Decimal Decoder', '7442 DECODER', 'standby'),
  makeCenterModule(1, 3, 'IC_7485', 'IC_7485', '7485 4-Bit Magnitude Comparator', '7485 COMP', 'standby'),
  makeCenterModule(2, 3, 'IC_74393', 'IC_74393', '74393 Dual 4-Bit Binary Counter', '74393 CNT', 'standby'),
  makeCenterModule(3, 3, 'MV3', 'MV3', 'Multi Vibrator 3', 'MV 3', 'standby'),

  // Column 4 — 4 Daughter Slots (all standby)
  makeCenterModule(0, 4, 'IC_7447', 'IC_7447', '7447 BCD to 7-Seg (CA)', '7447 CA DEC', 'standby'),
  makeCenterModule(1, 4, 'IC_7475', 'IC_7475', '7475 4-Bit Bistable Latch', '7475 LATCH', 'standby'),
  makeCenterModule(2, 4, 'IC_7448', 'IC_7448', '7448 BCD to 7-Seg (CC)', '7448 CC DEC', 'standby'),
  makeCenterModule(3, 4, 'IC_7483', 'IC_7483', '7483 4-Bit Binary Full Adder', '7483 ADDER', 'standby'),
];

export const ALL_MODULES: BoardModuleSpec[] = [...PERIMETER_MODULES, ...CENTER_MODULES];

// =========================================================================
// DUAL-HOLE SOCKETS & INTERACTIVE HARDWARE CONTROLS GENERATION
// =========================================================================
const sockets: SocketSpec[] = [];
const slideSwitches: SlideSwitchControlSpec[] = [];
const buttonSwitches: ButtonSwitchControlSpec[] = [];
const ledIndicators: LedIndicatorSpec[] = [];

const pitch = BOARD_DIMENSIONS.dualHolePitch;

function pushDualSockets(
  moduleId: string,
  moduleType: ActiveModuleType,
  pinKey: string,
  direction: PinDirection,
  centerX: number,
  y: number,
  z: number,
  baseTooltip: string,
  pinNumber?: number
): [string, string] {
  const nodeId = `NODE_${moduleId}_${pinKey}`;
  const half = pitch / 2;
  const idA = `${moduleId}:${pinKey}:A`;
  const idB = `${moduleId}:${pinKey}:B`;
  sockets.push(
    {
      id: idA,
      nodeId,
      moduleId,
      moduleType,
      pinKey,
      pinNumber,
      hole: 'A',
      direction,
      position: { x: Number((centerX - half).toFixed(4)), y, z: Number(z.toFixed(4)) },
      tooltip: `${baseTooltip} • Hole A`,
    },
    {
      id: idB,
      nodeId,
      moduleId,
      moduleType,
      pinKey,
      pinNumber,
      hole: 'B',
      direction,
      position: { x: Number((centerX + half).toFixed(4)), y, z: Number(z.toFixed(4)) },
      tooltip: `${baseTooltip} • Hole B`,
    }
  );
  return [idA, idB];
}

// 1. SLIDE SWITCHES (SW1..SW16 in 4x4 grid + 4 vertical dual-hole headers on right)
const slideBlock = ALL_MODULES.find((m) => m.id === 'SLIDE_SWITCH')!;
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    const swIndex = r * 4 + c + 1;
    const swId = `SW${swIndex}`;
    const swX = slideBlock.position.x - 2.25 + c * 1.1;
    const swZ = slideBlock.position.z - 4.1 + r * 2.75;
    // Right-side header block: 4 headers stacked (one per row r=0..3, 4 pins per header for c=0..3)
    const hdrX = slideBlock.position.x + 2.45;
    const hdrBaseZ = slideBlock.position.z - 4.8 + r * 2.75;
    const hdrZ = hdrBaseZ + c * 0.44;
    const [sA, sB] = pushDualSockets(
      'SLIDE_SWITCH',
      'SLIDE_SWITCH',
      swId,
      'io_source',
      hdrX,
      BOARD_DIMENSIONS.baseBoardHeaderTopY,
      hdrZ,
      `Slide Switch ${swId} (ON=HIGH, OFF=LOW)`
    );
    slideSwitches.push({
      id: swId,
      index: swIndex,
      row: r,
      col: c,
      position: { x: Number(swX.toFixed(4)), y: 0.08, z: Number(swZ.toFixed(4)) },
      nodeId: `NODE_SLIDE_SWITCH_${swId}`,
      socketIds: [sA, sB],
    });
  }
}

// 2. BUTTON SWITCHES (BTN1..BTN4 in 2x2 grid + 1 vertical dual-hole header on right)
const btnBlock = ALL_MODULES.find((m) => m.id === 'BUTTON_SWITCH')!;
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 2; c++) {
    const idx = r * 2 + c + 1;
    const btnId = `BTN${idx}`;
    const bx = btnBlock.position.x - 1.55 + c * 1.85;
    const bz = btnBlock.position.z - 1.05 + r * 2.1;
    const hdrX = btnBlock.position.x + 2.45;
    const hdrZ = btnBlock.position.z - 0.85 + (idx - 1) * 0.56;
    const [sA, sB] = pushDualSockets(
      'BUTTON_SWITCH',
      'BUTTON_SWITCH',
      btnId,
      'io_source',
      hdrX,
      BOARD_DIMENSIONS.baseBoardHeaderTopY,
      hdrZ,
      `Button ${btnId} (Active-Low: Pressed=LOW)`
    );
    buttonSwitches.push({
      id: btnId,
      index: idx,
      row: r,
      col: c,
      position: { x: Number(bx.toFixed(4)), y: 0.1, z: Number(bz.toFixed(4)) },
      nodeId: `NODE_BUTTON_SWITCH_${btnId}`,
      socketIds: [sA, sB],
    });
  }
}

// 3. LED BANKS (RED D1..D8, BLUE D1..D8: 2x4 LED grid + 1 vertical 8-row dual-hole header on left)
for (const [modId, bank, prefix] of [
  ['LED_RED', 'red', 'RED_D'] as const,
  ['LED_BLUE', 'blue', 'BLUE_D'] as const,
]) {
  const mod = ALL_MODULES.find((m) => m.id === modId)!;
  for (let i = 0; i < 8; i++) {
    const r = Math.floor(i / 4);
    const c = i % 4;
    const ledId = `${prefix}${i + 1}`;
    const lx = mod.position.x - 0.55 + c * 1.05;
    const lz = mod.position.z - 0.8 + r * 1.6;
    const hdrX = mod.position.x - 2.45;
    const hdrZ = mod.position.z - 1.75 + i * 0.5;
    const [sA, sB] = pushDualSockets(
      modId,
      modId,
      ledId,
      'input',
      hdrX,
      BOARD_DIMENSIONS.baseBoardHeaderTopY,
      hdrZ,
      `${bank === 'red' ? 'Red' : 'Blue'} LED ${ledId} (HIGH=LIT)`
    );
    ledIndicators.push({
      id: ledId,
      bank,
      index: i + 1,
      row: r,
      col: c,
      position: { x: Number(lx.toFixed(4)), y: 0.1, z: Number(lz.toFixed(4)) },
      nodeId: `NODE_${modId}_${ledId}`,
      socketIds: [sA, sB],
    });
  }
}

// 4. ACTIVE CENTER IC MODULES (7404, 7408, 7432, 7400, 7402, 7486)
const GATE_NAME_SHORT: Record<ActiveGateModuleType, string> = {
  IC_7404: '7404 NOT',
  IC_7408: '7408 AND',
  IC_7432: '7432 OR',
  IC_7400: '7400 NAND',
  IC_7402: '7402 NOR',
  IC_7486: '7486 XOR',
};

for (const mod of CENTER_MODULES) {
  if (mod.status !== 'active' || !mod.gates) continue;
  const gType = mod.type as ActiveGateModuleType;
  const modLabel = GATE_NAME_SHORT[gType];
  const layout = getGateModuleLayout(mod);
  const headerY = layout.headerTopY;
  const leftX = mod.position.x - 2.02;
  const rightX = mod.position.x + 2.02;

  const { leftStepZ, leftStartZ, rightStartZ, rightStepZ } = layout;

  let leftCursor = 0;
  for (const gate of mod.gates) {
    gate.inputPins.forEach((pinNum, inIdx) => {
      const inRole = gate.inputPins.length === 1 ? `Gate ${gate.gateIndex} In` : `Gate ${gate.gateIndex} In ${inIdx === 0 ? 'A' : 'B'}`;
      const z = mod.position.z + leftStartZ + leftCursor * leftStepZ;
      leftCursor++;
      pushDualSockets(
        mod.id,
        gType,
        `PIN${pinNum}`,
        'input',
        leftX,
        headerY,
        z,
        `${modLabel} • Pin ${pinNum} (${inRole})`,
        pinNum
      );
    });

    const outZ = mod.position.z + rightStartZ + (gate.gateIndex - 1) * rightStepZ;
    pushDualSockets(
      mod.id,
      gType,
      `PIN${gate.outputPin}`,
      'output',
      rightX,
      headerY,
      outZ,
      `${modLabel} • Pin ${gate.outputPin} (Gate ${gate.gateIndex} Out)`,
      gate.outputPin
    );
  }
}

export const ALL_SOCKETS: SocketSpec[] = sockets;
export const SLIDE_SWITCHES: SlideSwitchControlSpec[] = slideSwitches;
export const BUTTON_SWITCHES: ButtonSwitchControlSpec[] = buttonSwitches;
export const LED_INDICATORS: LedIndicatorSpec[] = ledIndicators;

export const SOCKET_MAP: Record<string, SocketSpec> = Object.fromEntries(
  ALL_SOCKETS.map((s) => [s.id, s])
);

export const MODULE_MAP: Record<string, BoardModuleSpec> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.id, m])
);

/** Utility used by tests and build checks to verify zero overlapping module bounds on PCB. */
export function findOverlappingModules(modules: BoardModuleSpec[] = ALL_MODULES): Array<[string, string]> {
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i].bounds;
      const b = modules[j].bounds;
      const xOverlap = a.minX < b.maxX && a.maxX > b.minX;
      const zOverlap = a.minZ < b.maxZ && a.maxZ > b.minZ;
      if (xOverlap && zOverlap) {
        overlaps.push([modules[i].id, modules[j].id]);
      }
    }
  }
  return overlaps;
}
