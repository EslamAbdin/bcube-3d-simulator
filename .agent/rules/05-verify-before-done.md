# Self-Verification Protocol
Never declare a milestone finished until ALL checks pass:
1. Run `npx tsc --noEmit` -> MUST have 0 errors.
2. Run `npm test` -> MUST have 100% passing unit tests.
3. For any milestone touching 3D/UI:
   - Run `npm run build` to verify clean production bundling.
   - Launch the dev server and inspect the live app in the browser tool.
   - Verify 0 console errors and 0 WebGL warnings.
   - Visually inspect both `3D Free View` and `2D Wiring View` to confirm crisp silkscreen legibility, zero overlapping modules, accurate switch animation, accurate wire seating, and instant LED updates.
