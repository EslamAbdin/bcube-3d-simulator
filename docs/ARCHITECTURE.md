# bCube 3D Simulator — Architecture Overview

## 1. Strict 4-Layer Separation
- **`src/schema/` (`boardSchema.ts`)**: Pure TypeScript Single Source of Truth containing exact physical dimensions, coordinates, slot descriptors, `getGateModuleLayout(mod)`, and dual-hole sockets. Zero React or Three.js imports.
- **`src/engine/` (`gateEvaluators.ts`, `LogicEngine.ts`, `circuitAnalyzer.ts`)**: Pure TypeScript electrical netlist resolver (Disjoint-Set / Union-Find), iterative TTL signal solver (`'HIGH' | 'LOW' | 'FLOATING' | 'CONFLICT'`), Auto Truth Table generator (`generateTruthTable`), Auto-Grader (`gradeChallenge`), and Multi-Channel Pin Timing Diagram waveform analyzer (`generateTimingDiagram`). Zero React or Three.js imports.
- **`src/data/` (`presetCircuits.ts`, `labChallenges.ts`, `teachingContent.ts`, `icDatasheets.ts`)**: Pure structured data for the 5 textbook presets, 5 auto-graded student challenges, bilingual EN/Arabic teaching lessons + live gate explainer, and DIP-14 IC datasheet schematics.
- **`src/store/` (`useSimulatorStore.ts`)**: Zustand state container managing switch states, momentary/latched pushbuttons, serializable wires, undo stack, Teaching Mode / X-Ray / Lab Drawer / IC Inspector UI flags, and invoking `LogicEngine` synchronously whenever inputs or wiring change.
- **`src/scene/` & `src/components/`**: Procedural React Three Fiber 3D workbench and responsive Tailwind CSS HUD reading from the schema and Zustand store with granular per-item selectors.

## 2. Scale, Board Matrix & Coordinate System (Y-Datum)
- **Scale**: `1 Three.js unit = 10 mm`.
- **Main PCB**: `44.0 × 29.0 × 0.4` units (`440mm × 290mm × 4mm`), centered at `(0, 0)` on X/Z so X spans `[-22, +22]` and Z spans `[-14.5, +14.5]`. Main PCB top sits at `Y = 0.00`.
- **Center Logic Matrix (100% bCube Physical Alignment)**:
  - **Column 0 (5 Fixed Built-In Blocks on Main PCB, `depth = 3.92`, `isDaughterModule: false`)**: top-to-bottom `IC_7400` (NAND) → `IC_7408` (AND) → `IC_7432` (OR) → `IC_7402` (NOR) → `IC_7404` (NOT).
  - **Column 1 (4 Removable Daughter Slots, `depth = 4.80`, `isDaughterModule: true`)**: Row 0 `IC_7410` (standby), Row 1 `IC_7420` (standby), **Row 2 `IC_7486` (XOR, active)** mounted on brass hex standoffs from `Y = 0.05` to `Y = 0.20`, Row 3 `MV1` (standby).
  - **Columns 2–4 (12 Standby Daughter Bays)**: blacked-out expansion bays (`#05070b`) with zero 3D standby geometry rendered (`StandbyIOModules` skipped) to eliminate clutter and keep GPU draw calls minimal on phones.
- **`getGateModuleLayout(mod)`**: Computes identical header positions, IC Z-offsets, pin steps, and trace alignments across `boardSchema.ts`, `silkscreenGenerator.ts`, `LogicModulesGrid.tsx`, `DipICChip.tsx`, and `GateElectricityOverlay.tsx`.

## 3. Dual-Hole Pin Headers, Signal Flow & Rendering Optimizations
- **Dual-Hole Branching**: Every active signal pin has two adjacent female sockets (`hole: 'A'` and `hole: 'B'`, `0.254` units = `2.54mm` pitch apart) sharing one `nodeId`. `LogicEngine` merges all `hole A`/`hole B` pairs alongside user wires using Union-Find.
- **Polarity**: Slide Switches (`ON = HIGH`, `OFF = LOW`), Pushbuttons (**Active-Low**: `released = HIGH`, `pressed = LOW`), Red/Blue LEDs (**Common Cathode**: `HIGH = LIT`). Competing outputs on one net evaluate to `'CONFLICT'`.
- **Live Electricity Overlay (`GateElectricityOverlay.tsx`)**: Batches per-pin SMD indicator LEDs, horizontal PCB trace overlays, and gate symbol cores into 4 `InstancedMesh` calls (`MeshBasicMaterial`) driven directly by `netStates`.
- **Shadow-Free Demand Rendering**: `<Canvas shadows={false} frameloop="demand" />` paired with memoized wire `TubeGeometry` and mobile `Eco` pixel ratio scaling keeps rendering responsive even on low-end student phones and laptops.

## 4. Extensibility for Future Hardware Revisions
- Gate evaluation dispatches through `gateEvaluators: Record<ActiveGateModuleType, GateEvaluatorFn>`.
- Activating any blacked-out `'standby'` slot (such as `IC_7410`, `IC_7447`, `IC_7473`, `IC_7483`, `IC_7485`, `IC_7490`) only requires defining its active sockets/geometry in `boardSchema.ts` and registering its pure evaluator in `gateEvaluators.ts`.
