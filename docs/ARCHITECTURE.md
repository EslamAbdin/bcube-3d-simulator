# bCube 3D Simulator — Architecture Overview

## 1. Strict 4-Layer Separation
- **`src/schema/` (`boardSchema.ts`)**: Pure TypeScript data model containing exact physical dimensions, coordinates, slots, and dual-hole sockets. Zero React or Three.js imports.
- **`src/engine/` (`gateEvaluators.ts`, `LogicEngine.ts`)**: Pure TypeScript electrical netlist resolver (Union-Find) and iterative signal solver (`'HIGH' | 'LOW' | 'FLOATING' | 'CONFLICT'`). Zero React or Three.js imports.
- **`src/store/` (`useSimulatorStore.ts`)**: Zustand state container managing switch states, momentary/latched pushbuttons, serializable wires, UI flags, and invoking `LogicEngine` synchronously whenever inputs or wiring change.
- **`src/scene/` & `src/components/`**: Procedural React Three Fiber 3D workbench and lightweight Tailwind HUD reading solely from the schema and Zustand store.

## 2. Scale & Coordinate System (Y-Datum)
- **Scale**: `1 Three.js unit = 10 mm`.
- **Main PCB**: `44.0 × 29.0 × 0.4` units (`440mm × 290mm × 4mm`), centered at `(0, 0)` on X/Z so X spans `[-22, +22]` and Z spans `[-14.5, +14.5]`.
- **Top Surface Datum**: Main PCB top sits at `Y = 0.00`. Mounted daughter logic module PCBs (`5.2 × 4.8 × 0.15` units) sit on standoffs from `Y = 0.05` to `Y = 0.20`, with female header top surfaces cleanly elevated above module PCBs.

## 3. Dual-Hole Pin Headers & Signal Semantics
- Every active signal pin has two adjacent female sockets (`hole: 'A'` and `hole: 'B'`, `0.254` units = `2.54mm` pitch apart) sharing an identical `nodeId`.
- `LogicEngine` merges all `hole A` / `hole B` pairs alongside user wires using Disjoint-Set (Union-Find), allowing students to branch a single output or switch across multiple gates without stacking plugs.
- **Polarity**: Slide Switches (`ON = HIGH`, `OFF = LOW`), Button Switches (**Active-Low**: `released = HIGH`, `pressed = LOW`), Red/Blue LEDs (**Common Cathode**: `HIGH = LIT`).
- **Bus Contention**: When two outputs drive `HIGH` and `LOW` onto the same merged electrical net, that net evaluates to `'CONFLICT'`.

## 4. Plugin-Ready v2 Module Registry
- Gate evaluation dispatches through `gateEvaluators: Record<ActiveGateModuleType, GateEvaluatorFn>`.
- Upgrading any `'standby'` slot (such as `7410`, `7447`, `7473`, `7474`, `7483`, `7485`, `7490`) requires adding its active socket descriptor in `boardSchema.ts` and registering its pure evaluator function in `gateEvaluators.ts`.
