// @ts-expect-error Node built-in available when Vite config runs in Node
import { execSync } from 'node:child_process';
// @ts-expect-error Node built-in available when Vite config runs in Node
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

function resolveBuildSha(): string {
  // @ts-expect-error Node process global available when Vite config runs in Node
  const envSha = (typeof process !== 'undefined' ? process.env?.VERCEL_GIT_COMMIT_SHA : undefined)?.trim();
  if (envSha) return envSha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}

const buildSha = resolveBuildSha();
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'r3f-vendor': ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
