# Student Ergonomics, Camera & Wiring UX Rules
1. **Dual Camera Modes (Instant Toggle):**
   - `3D Free View`: Perspective OrbitControls with smooth damping and polar angle clamps (prevent flipping under the board).
   - `2D Wiring View`: Smoothly animates camera directly overhead (top-down) so students can wire circuits with zero parallax error. Shortcut: `V`.
2. **Effortless Socket Clicking:**
   - Every active socket hole must have an invisible raycast collider (`radius >= 0.14` units) slightly larger than the visual hole, with cursor change (`pointer`), glowing highlight ring, and a crisp HUD/floating tooltip showing exact pin identity (e.g., `7408 AND • Pin 1 (Gate 1 In A) • Hole A`).
3. **Click-to-Wire Flow:**
   - Clicking an active socket starts a live preview wire ("ghost wire") tracking the pointer to the nearest hovered socket.
   - Clicking a second active socket creates the wire; pressing `Escape` or Right-Click cancels.
   - Clicking an existing wire selects/highlights it; Right-Click on a wire or pressing `Delete`/`Backspace` removes it.
   - Prevent duplicate wires between the exact same two sockets.
4. **Button Switch Ergonomics:**
   - Single press-and-hold acts as momentary push (`LOW` while held, `HIGH` on release).
   - Provide a subtle "Lock/Latch" toggle (e.g., Shift+Click or Double-Click) so a student using a single mouse can hold two buttons down simultaneously when testing 2-input gates.
5. **Wire Color Palette:** Provide quick color swatches in the top HUD (Red, Yellow, Green, Blue, Orange, White, Black) with optional auto-cycle color mode.
