# Git & Static Deployment Rules
1. **Static Hosting Compatibility:** Configure `vite.config.ts` with `base: './'` so the built app works seamlessly on both GitHub Pages subpaths and root domains (Vercel/Cloudflare Pages). Never use hardcoded `/assets/...` absolute paths.
2. **Git Hygiene:** Ensure `.gitignore` excludes `node_modules/`, `dist/`, `.env*`, `*.pdf`, and `docs/reference/` (never commit copyrighted reference scans). Keep `.agent/rules/` tracked in Git.
3. **GitHub Pages Workflow:** When initializing the Vite project in Milestone 1, also generate `.github/workflows/deploy.yml` using the official `actions/deploy-pages` action to run `npm ci && npm run build` and deploy `dist/` on pushes to `main`.
4. **Milestone Commits:** After each milestone passes all verification checks (`tsc`, `npm test`, `npm run build`), summarize a clean conventional commit message so I can commit a safe checkpoint.
