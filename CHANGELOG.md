# Changelog

All notable milestones and upgrades built for **bCube 3D Digital Logic Circuit Simulator** are documented below.

## [Unreleased / Latest on `main`] — Hardware Fidelity & Interactive Educational Suite

### Hardware Alignment & Rendering Performance
- Aligned the center logic matrix **100% with the physical bCube kit** in `src/schema/boardSchema.ts` (`getGateModuleLayout`) and `src/scene/textures/silkscreenGenerator.ts`:
  - **Column 0 (Fixed Built-In Logic Blocks on Main PCB):** Top-to-bottom order `IC_7400` (NAND) → `IC_7408` (AND) → `IC_7432` (OR) → `IC_7402` (NOR) → `IC_7404` (NOT).
  - **Column 1 (Removable Daughter Slots):** `IC_7486` (XOR) mounted on the 3rd (second-to-last) slot with brass hex standoffs; unused slots (`IC_7410`, `IC_7420`, `MV1`) blacked out.
- Blacked out all unimplemented perimeter and Column 2–4 standby slots (`#05070b`) and removed standby 3D meshes (`StandbyIOModules` decoupled from `App.tsx`) for minimal draw calls and cleaner visual focus.
- Removed dynamic shadows (`shadows={false}`) and optimized scene lights in `src/App.tsx` and `src/scene/LabEnvironment.tsx` for smooth phone and low-end laptop framerates.

### Live Electricity & Educational Tools
- **Per-Pin SMD LEDs & Glowing Gate Traces (`src/scene/parts/GateElectricityOverlay.tsx`):** Instanced SMD pin indicators, live PCB wire trace bars, and gate symbol cores showing flowing `+5V` (green), cut-off `0V` (red), open/floating (dark), and contention conflicts (amber).
- **Bilingual Teaching Mode (`src/data/teachingContent.ts`, `src/components/TeachingPanel.tsx`):** Toggleable `Teach` / `تعلّم` drawer with persistent English (`EN`) and Simple Arabic RTL (`عربي`) modes, live gate-by-gate electricity narration, and 7 one-click lessons (`NOT`, `AND`, `OR`, `NAND`, `NOR`, `XOR`, `Half Adder`).
- **Multi-Channel Pin Timing Diagram (`src/engine/circuitAnalyzer.ts`, `src/components/TimingDiagramView.tsx`):** Interactive oscilloscope SVG waveforms across wired switches/buttons, active gate I/O pins, and output LEDs with click-to-scrub 3D sync, auto-play sweep, channel filters, and `Save SVG` export.
- **Interactive DIP-14 IC X-Ray & Datasheet Inspector (`src/data/icDatasheets.ts`, `src/components/IcInspectorModal.tsx`, `src/scene/parts/DipICChip.tsx`):** Click any black `SN74LSxxN` IC chip to inspect live internal DIP-14 pin wiring (`VCC=14`, `GND=7`), Boolean equations with overbars, truth tables, electrical specs, `7402`/`7404` routing notes, active board wiring list, 6-IC switcher, and `EN/عربي` language toggle.
- **Expanded Tests:** Added `TeachingMode.test.ts`, `IcDatasheets.test.ts`, and timing diagram assertions in `CircuitAnalyzer.test.ts` (`31/31` Vitest tests passing).

---

## `0e571e2` — Mobile Performance & Demand Rendering (`perf/mobile`)
- Switched WebGL canvas to `frameloop="demand"` with camera/state invalidation helpers.
- Converted high-count repeated hardware (`ActiveIOModules`, `WhitePinHeader`, `StandbyIOModules`, socket rings) to instanced batches and shared geometries/materials.
- Added responsive mobile HUD ergonomics and `Eco` DPR mode toggle.

## `3ae1376` — Milestone 5: Student Study Platform & Hardware Alignment
- Implemented pure `src/engine/circuitAnalyzer.ts` (`generateTruthTable`, `gradeChallenge`) with `CircuitAnalyzer.test.ts`.
- Added 5 auto-graded student labs (`src/data/labChallenges.ts`) and slide-over `LabDrawer.tsx` (Truth Table + Challenges tabs).
- Added Signal Flow X-Ray wire glow toggle (`signalFlowEnabled`), `HelpModal.tsx`, border-integrated silkscreens, water-clear LED domes, and granular Zustand selectors.

## `c76873f` — Milestone 4: 3D Jumper Wiring, Presets & Sharing
- Added arched 3D `TubeGeometry` jumper wires, magnetic-snap ghost wire preview, color selector, wire selection/deletion, and `Ctrl+Z` undo (`JumperWires.tsx`, `SocketHitboxes.tsx`, `soundEffects.ts`).
- Added 5 textbook presets (`src/data/presetCircuits.ts`), JSON export/import, URL `#circuit=` sharing, and `PresetsAndSerialization.test.ts`.

## `c8baa13` — Milestone 3: Interactive Controls, Reactive LEDs & HUD
- Added clickable Slide Switches (`SW1–16`), momentary + latched Pushbuttons (`BTN1–4`), glowing Red/Blue LEDs, Web Audio click effects, and `TopHud` / `StatusBar`.

## `fcc472b` — Milestone 2: 3D Board Twin, Vector Silkscreens & Dual Camera Rig
- Built procedural 3D bCube chassis (`BoardChassis.tsx`), high-DPI canvas PCB silkscreens (`silkscreenGenerator.ts`), dual-hole 2.54 mm white pin headers (`WhitePinHeader.tsx`), `DipICChip.tsx`, `LogicModulesGrid.tsx`, and 3D/2D `CameraRig.tsx`.

## `72b5774` — Milestone 1: Schema, Pure Logic Engine, Store & CI Scaffold
- Created `boardSchema.ts`, pure `LogicEngine.ts` + `gateEvaluators.ts`, `useSimulatorStore.ts`, `LogicEngine.test.ts`, Vite + Tailwind v4 setup, and GitHub Pages workflow.
