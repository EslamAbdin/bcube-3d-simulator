# bCube Digital Logic Kit — Hardware Truth Rules
Always enforce these exact hardware specifications across schema, engine, and 3D visuals:
1. **Single Source of Truth:** Every physical coordinate, module slot, and socket position MUST originate from `src/schema/boardSchema.ts`. Never hardcode coordinates inside 3D components.
2. **Board Aspect & Layout:** Main PCB is `440mm × 290mm × 4mm` in bCube solder-mask blue (`#0d6eab`). Render ALL visual zones of the real bCube kit (DIP Switch, 16 Slide Switches, 4 Button Switches, Waveform Generator, Pull-Up/Down Resistors, Voltage Control, Speaker, 2x Common Anode 7-Seg, 8 Red LEDs, 2x Common Cathode 7-Seg, 8 Blue LEDs, Frequency Counter, DAQ I/O, USB/Scope ports, and the 4x5 center grid of 20 logic module slots).
3. **v1 Active Scope vs Standby:**
   - **ACTIVE in v1:** 16 Slide Switches (`SW1–SW16`), 4 Button Switches (`BTN1–BTN4`), 8 Red LEDs (`RED_D1–D8`), 8 Blue LEDs (`BLUE_D1–D8`), and 6 basic 1-input/2-input logic gate modules: `7404` (NOT, 4 accessible gates), `7408` (AND), `7432` (OR), `7400` (NAND), `7402` (NOR), and `7486` (XOR).
   - **STANDBY in v1:** All remaining I/O blocks and center slots must still be rendered accurately in 3D as visual hardware blocks with `status: 'standby'` (non-wireable in v1, showing a clean "Standby (v2)" hover badge).
4. **Dual-Hole Pin Headers (CRITICAL):** Every signal pin on white female headers consists of TWO adjacent sockets side-by-side (`hole: 'A'` and `hole: 'B'`, 2.54mm pitch) internally shorted to the exact same electrical `nodeId`. This enables realistic wire branching without stacking plugs.
5. **Exact Electrical Polarity:**
   - **Slide Switches:** `ON = HIGH (+5V)`, `OFF = LOW (GND)`.
   - **Button Switches:** **Active-Low** (`released = HIGH`, `pressed = LOW`).
   - **Red & Blue LEDs:** Common Cathode (`HIGH = LIT`, `LOW/FLOATING = OFF`).
6. **PCB Pin Routing for 7402 (NOR):** Even though the physical 7402 DIP IC reverses pin direction, the bCube PCB routes all gate inputs to the LEFT white header (`2,3`, `5,6`, `8,9`, `11,12`) and all gate outputs to the RIGHT white header (`1,4,10,13`), consistent with `7408/7432/7400/7486`.
