# React Three Fiber & Procedural 3D Standards
1. **Strict Scale & Y-Datum (Zero Z-Fighting):**
   - Scale: `1 Three.js unit = 10mm` (Main board = `44 × 29`, thickness `0.4`).
   - Main blue PCB top face sits strictly at `Y = 0.00`.
   - Mounted daughter module PCBs (`5.2 × 4.8`, thickness `0.15`) sit cleanly on standoffs from `Y = 0.05` to `Y = 0.20`.
   - Silkscreen planes sit at `Y = topSurface + 0.004`. Never place coplanar faces at identical Y values.
2. **100% Procedural Geometry (Zero External GLB/Image Assets):**
   - Generate all PCBs, DIP-14 black ICs with metallic pins, white female headers, slide switches, square pushbuttons, LED domes, rotary knobs, and jumper wires procedurally.
   - Use `InstancedMesh` for repeated sub-parts (e.g., header holes, screws, IC legs) to keep draw calls low and FPS >= 60.
3. **Laser-Sharp Vector Silkscreen:**
   - Never use blurry raster textures for labels or gate symbols. Draw every module's blue PCB background, white traces, IEEE logic gate symbols (AND, OR, NOT, NAND, NOR, XOR), IC labels, and pin numbers onto high-DPI offscreen HTML5 Canvases (`512×512` per module, `anisotropy = 8`) and apply them as `THREE.CanvasTexture`.
4. **Realistic 3D LEDs & Materials:**
   - Lit LEDs must update material color + `emissive` + `emissiveIntensity` (>= 2.0) with a subtle glow halo so students can read outputs instantly from any angle.
5. **3D Jumper Wires:**
   - Render each wire using `THREE.CatmullRomCurve3` + `THREE.TubeGeometry` with molded black connector boots at both ends seated cleanly into the white header sockets.
   - Arc height scales smoothly with distance plus a tiny deterministic hash offset per wire ID so parallel wires never clip into each other.
6. **Memory Hygiene:** Never call React `setState` inside `useFrame`. Properly dispose procedural geometries and CanvasTextures on unmount.
