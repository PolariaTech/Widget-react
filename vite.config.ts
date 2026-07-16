/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  if (isLib) {
    return {
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      build: {
        lib: {
          entry: resolve(__dirname, 'src/embed.tsx'),
          name: 'MateoWidget',
          formats: ['es', 'iife'],
          fileName: (format) =>
            format === 'iife'
              ? 'assets/mateo-widget.js'
              : 'mateo-widget.es.js',
        },
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            exports: 'named',
          },
        },
      },
    };
  }

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'happy-dom',
    },
  };
});
