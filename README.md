# bCube 3D Digital Logic Circuit Simulator

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Three.js / R3F](https://img.shields.io/badge/Three.js-R3F-000000?logo=threedotjs&logoColor=white)
![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/Vitest-31%20passing-22C55E)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

An interactive, web-based **3D digital twin** of the **bCube Digital Logic Circuit** hardware trainer built with React Three Fiber, Three.js, Zustand, and a pure TypeScript circuit solver—designed for BTU Digital Engineering labs, classroom demonstrations, and self-paced student study across desktops and mobile phones.

---

## Key Features & Hardware Fidelity

### 1. 100% bCube Physical Hardware Layout
- **Perimeter Active I/O:**
  - **16 Slide Switches (`SW1–SW16`):** Organized in 4 stacked banks along the left I/O rail (`ON = +5V / HIGH`, `OFF = 0V / LOW`).
  - **4 Active-Low Pushbuttons (`BTN1–BTN4`):** Tactile momentary press (`0 / LOW` while held, `1 / HIGH` when released) plus **Shift+Click** or **Double-Click** latching.
  - **16 Water-Clear Output LEDs (`RED_D1–D8`, `BLUE_D1–D8`):** Common-cathode translucent domes with metallic lead frames that glow crimson (`RED`), electric blue (`BLUE`), or pulse amber on electrical bus `CONFLICT`.
- **Center Logic Gate Matrix (Active v1 Hardware + Blacked-Out Standby Bays):**
  - **Column 0 (5 Built-In Fixed Gate Blocks on Main PCB, top-to-bottom):**
    1. `IC_7400` — Quad 2-Input **NAND**
    2. `IC_7408` — Quad 2-Input **AND**
    3. `IC_7432` — Quad 2-Input **OR**
    4. `IC_7402` — Quad 2-Input **NOR** (authentic PCB-routed pinout: all gate inputs on the **left** header, outputs on the **right** header)
    5. `IC_7404` — **NOT** Inverter bank (4 exposed inverters matching the bCube front panel)
  - **Column 1 (Removable Daughter Module Column):**
    - Row 0 (`IC_7410`), Row 1 (`IC_7420`), Row 3 (`MV1`): blacked-out standby slots.
    - **Row 2 (3rd / second-to-last slot):** **`IC_7486` — Quad 2-Input XOR** daughter PCB mounted on brass hex standoffs.
  - **Columns 2–4 (12 Expansion Bays):** `IC_7490`, `IC_7473`, `NE555`, `MV2`, `IC_7442`, `IC_7485`, `IC_74393`, `MV3`, `IC_7447`, `IC_7475`, `IC_7448`, `IC_7483` plus unused perimeter slots (`DIP_SWITCH`, `WAVEFORM_GEN`, `PULL_UP_*`, `PULL_DOWN_*`, `VOLTAGE_CONTROL`, `SPEAKER`, `SEVEN_SEG_*`, `DAQ_*`, `FREQ_COUNTER`, `OSC_INPUT`, `USB_PORTS`) render as clean matte-black bays (`#05070b`) with zero 3D standby meshes for crisp focus and mobile GPU speed.
- **Dual-Hole 2.54 mm Headers:** Every active signal pin exposes two internally shorted holes (`Hole A` and `Hole B`), letting students branch a switch or gate output across multiple inputs without stacking plugs.

### 2. Interactive 3D Jumper Wiring & Pure Circuit Engine
- Click any socket hole to begin wiring, hover a destination to see a live arched `TubeGeometry` ghost preview with magnetic snapping, and click to connect.
- Wire color palette, **Right-Click** or `Delete` removal, `Ctrl+Z` undo, `Reset` (clear wires + switches), **JSON Export / Import**, and **Share URL** (`#circuit=...` hash serialization).
- Disjoint-Set (Union-Find) netlist resolver and iterative TTL signal solver (`'HIGH' | 'LOW' | 'FLOATING' | 'CONFLICT'`) with instant short-circuit / bus-contention detection.

### 3. Live Electricity & Signal Flow Visualization
- **Per-Pin SMD LEDs & Glowing Gate Traces (`GateElectricityOverlay.tsx`):** Instanced SMD indicator dots on active I/O and IC sockets plus live gate input/output PCB trace overlays and symbol cores:
  - **Green (`+5V` / `1`):** Electricity ON & flowing.
  - **Red (`0V` / `0`):** Electricity cut off.
  - **Dark / Unlit:** Open / Floating (unwired).
  - **Amber:** Short conflict (two competing outputs on one net).
- **Signal Flow X-Ray Toggle:** Highlights live `HIGH` jumper wires with bright green emissive glow and dims `LOW` wires for instant circuit tracing.

### 4. Built-In Study & Lab Platform
- **Bilingual Teaching Mode (`Teach` / `تعلّم` — English & Simple Arabic RTL):**
  - Persistent `EN ↔ عربي` toggle (`localStorage`), full Arabic RTL layout, live gate-by-gate electricity narration explaining *why* each wired gate outputs `1` or `0`, and **7 one-click guided lessons** (`NOT`, `AND`, `OR`, `NAND`, `NOR`, `XOR`, `Half Adder`).
- **Multi-Channel Pin Timing Diagram (`TimingDiagramView.tsx`):**
  - Oscilloscope-style vector SVG waveforms across all connected switches/buttons, active IC gate I/O pins (`7400`–`7486`), and output LEDs.
  - **Click-to-Scrub** synced directly to the 3D board switches, **▶ Play / ⏸ Pause** clock sweep (`900 ms`), channel filters (`All Pins`, `I/O + Gate Out`, `I/O Only`), and **`Save SVG`** export.
- **Interactive DIP-14 IC X-Ray & Datasheet Inspector (`IcInspectorModal.tsx`):**
  - Click any black `SN74LSxxN` IC package on the board to open its internal **14-pin DIP X-Ray diagram** (`VCC = Pin 14`, `GND = Pin 7`, Pin-1 notch) colored live by current circuit signals, textbook Boolean equations with overbars, truth table, electrical specs, `7402`/`7404` PCB routing notes, active board connections, 6-IC quick switcher, `EN/عربي` switch, and 1-click example loader.
- **Auto Truth Table Analyzer & Auto-Graded Lab Challenges (`LabDrawer.tsx`):**
  - Automatically discovers wired inputs (`≤ 4` inputs / `16` rows, with clean truncation notice above 4), highlights the active live row, supports click-to-test, and exports Markdown tables.
  - **5 Auto-Graded Lab Challenges:** Basic AND Gate, Inverter (NOT), XNOR from XOR+NOT, Half Adder (`Sum` + `Carry`), and De Morgan's 1st Theorem Proof (`!(A+B) ≡ !A · !B`) with progressive hints and pass/fail scoring.
  - **5 Textbook Circuit Presets:** One-click wiring for Basic AND, Basic OR, XNOR Gate, Half Adder, and De Morgan's 1st Theorem.

### 5. Performance & Mobile Ergonomics
- **Shadow-Free Demand Rendering:** `Canvas` runs with `shadows={false}` and `frameloop="demand"` (waking frames only on interaction/wiring/camera changes) plus instanced batching for socket headers, SMD pin LEDs, and gate traces.
- **Responsive Phone / Laptop HUD & `Eco` Mode:** Auto-enabled battery/GPU-friendly pixel ratio (`Eco` toggle) on narrow viewports, scrollable HUD drawer/toolbar, and **Dual Camera Rig** (`3D Free View` ↔ zero-parallax `2D Wiring View`).

---

## What Was Done (Development History)

| Phase | Commit / Milestone | Highlights |
|---|---|---|
| **Milestone 1** | `72b5774` | Pure TypeScript board schema (`boardSchema.ts`), TTL `LogicEngine` (Union-Find + iterative solver), Zustand store, Vitest suite, `.github/workflows/deploy.yml`. |
| **Milestone 2** | `fcc472b` | Procedural 3D PCB chassis, high-DPI canvas vector silkscreens (`silkscreenGenerator.ts`), white 2.54 mm female headers, DIP-14 chips, dual 3D/2D camera rig. |
| **Milestone 3** | `c8baa13` | Interactive Slide Switches, momentary + latched Pushbuttons, reactive Red/Blue LEDs, socket hitboxes, and Top HUD / Status Bar. |
| **Milestone 4** | `c76873f` | 3D arched `TubeGeometry` jumper wires, magnetic snap ghost preview, Web Audio feedback, 5 textbook presets, JSON export/import & URL hash sharing. |
| **Milestone 5** | `3ae1376` | Pure `circuitAnalyzer.ts`, Slide-over Lab Drawer (Live Truth Table + 5 Auto-Graded Challenges), Signal Flow X-Ray wires, Quick Help modal, bCube hardware alignment & memoized selectors. |
| **Mobile Perf** | `0e571e2` | `frameloop="demand"`, instanced batching (`ActiveIOModules`, `WhitePinHeader`, `StandbyIOModules`), responsive phone layout & `Eco` DPR toggle. |
| **Hardware Fidelity & Edu Suite** | Latest on `main` | 100% real bCube Column 0/1 geometry (`7400`→`7408`→`7432`→`7402`→`7404` built-in, `7486` daughter module), blacked-out standby slots, shadow-free lighting, per-pin SMD LEDs + live lit gate lines, Bilingual EN/AR Teaching Mode, Multi-Channel Pin Timing Diagram, and Interactive DIP-14 IC X-Ray Inspector. |

See [CHANGELOG.md](CHANGELOG.md) for the full chronological breakdown.

---

## Architecture Overview

Strict 4-layer separation keeps electrical simulation 100% pure and independently testable:

```text
bcube-3d-simulator/
├── .github/workflows/
│   ├── ci.yml                # Typecheck, Vitest (31 tests), and Vite build on push/PR
│   └── deploy.yml            # GitHub Pages static deployment
├── docs/
│   └── ARCHITECTURE.md       # Coordinate datum, dual-hole Union-Find & solver details
├── src/
│   ├── schema/
│   │   └── boardSchema.ts    # Single Source of Truth dimensions, slots & dual-hole sockets
│   ├── engine/
│   │   ├── gateEvaluators.ts # Pure TTL gate truth functions (7400–7486)
│   │   ├── LogicEngine.ts    # Union-Find netlist builder & iterative signal solver
│   │   ├── circuitAnalyzer.ts# Auto Truth Table, Challenge Grader & Pin Timing Diagram
│   │   └── __tests__/        # 5 Vitest suites (31 unit tests)
│   ├── data/
│   │   ├── presetCircuits.ts # 5 textbook presets
│   │   ├── labChallenges.ts  # 5 auto-graded student labs
│   │   ├── teachingContent.ts# EN / Arabic (RTL) teaching copy, lessons & live explainer
│   │   └── icDatasheets.ts   # DIP-14 pinouts, Boolean equations, truth tables & specs
│   ├── store/
│   │   └── useSimulatorStore.ts
│   ├── scene/
│   │   ├── CameraRig.tsx
│   │   ├── LabEnvironment.tsx
│   │   ├── textures/silkscreenGenerator.ts
│   │   └── parts/            # BoardChassis, ActiveIOModules, LogicModulesGrid, DipICChip,
│   │                         # GateElectricityOverlay, JumperWires, SocketHitboxes, WhitePinHeader
│   └── components/           # TopHud, StatusBar, LabDrawer, TimingDiagramView,
│                             # TeachingPanel, IcInspectorModal, HelpModal
├── vercel.json               # Vite framework + dist output config for Vercel Git deploy
└── vite.config.ts            # `base: './'` static portability + vendor chunk splitting
```

---

## Getting Started

### Prerequisites
- **Node.js 20+** and **npm**

### Local Development
```bash
npm install
npm run dev
```

### Verification & Build Commands
```bash
npx tsc --noEmit   # Strict TypeScript check
npm test           # Run all 5 Vitest test files (31 tests)
npm run build      # Production bundle -> dist/
npm run preview    # Preview production build locally
```

---

## Keyboard & Mouse Controls

| Control | Action |
|---|---|
| **Click Hole → Click Hole** | Start jumper wire, preview snap path, and connect |
| **Right-Click Wire / `Delete`** | Delete hovered or selected jumper wire |
| **`Ctrl+Z`** | Undo last wire change |
| **`Esc` / Right-Click (while wiring)** | Cancel active wire placement |
| **Click Slide Switch (`SW1–16`)** | Toggle `ON (+5V)` / `OFF (0V)` |
| **Hold / `Shift+Click` / Double-Click Button (`BTN1–4`)** | Momentary or latched Active-Low `0 / LOW` pulse |
| **Click Black IC (`SN74LSxxN`)** | Open Interactive DIP-14 IC X-Ray & Datasheet Inspector |
| **`V`** | Toggle **3D Free View** ↔ **2D Top-Down Wiring View** |
| **`R`** | Reset camera framing |

---

## Deployment & Auto-Updates

- **Vercel (Recommended — Auto-Deploys on Every `git push`):**
  Configured via [`vercel.json`](vercel.json) (`framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`). Once connected to GitHub, pushing any update to `main` automatically triggers a fresh cloud build and updates the live deployment.
- **GitHub Pages:**
  [`vite.config.ts`](vite.config.ts) sets `base: './'` for clean relative asset paths, and [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys `dist/` automatically on pushes to `main`.

---

## License

Released under the [MIT License](LICENSE).
