# Clean Architecture & v2 Extensibility Rules
1. **Strict 4-Layer Separation:**
   - `src/schema/`: Pure data definitions (`boardSchema.ts`) — zero React/Three imports.
   - `src/engine/`: Pure TypeScript simulation (`LogicEngine.ts`, gate evaluators) — zero React/Three imports.
   - `src/store/`: Zustand store (`useSimulatorStore.ts`) managing inputs, wires, UI state, and invoking `LogicEngine`.
   - `src/scene/` & `src/components/`: 3D rendering and lightweight Tailwind HUD.
2. **Plugin-Ready Module Registry:**
   - Implement gate evaluation via a clean registry map (`Record<ModuleType, EvaluatorFn>`) so adding future bCube ICs (7410, 7447, 7473, 7474, 7483, 7490, etc.) only requires adding a schema entry and a pure evaluator function.
3. **Serializable Circuits from Day 1:**
   - Keep circuit state cleanly serializable (`{ version, switches, buttons, wires }`) to support JSON export/import and preset experiments (e.g., Basic AND, XOR, Half Adder, De Morgan's Law).
4. **Bus Contention Safety:**
   - Detect output-to-output conflicts (`CONFLICT`) in `LogicEngine` and surface a clear, non-blocking warning banner in the HUD identifying the shorted net.
