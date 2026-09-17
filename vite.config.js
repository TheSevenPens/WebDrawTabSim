import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  base: '/WebDrawTabSim/',
  // Preserve the previous Vite 5 compilation target during the toolchain upgrade.
  build: {
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    outDir: mode === 'visual' ? '.visual-dist' : 'dist',
    ...(mode === 'visual' ? { rolldownOptions: {
      input: { app: 'index.html', reference: 'visual/runner.html' },
    } } : {}),
  },
}));
