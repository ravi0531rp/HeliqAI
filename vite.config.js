import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom';
          }

          if (id.includes('node_modules/react/')) {
            return 'react';
          }

          if (id.includes('node_modules/@react-three/drei')) {
            return 'drei';
          }

          if (id.includes('node_modules/@react-three/fiber')) {
            return 'fiber';
          }

          if (id.includes('node_modules/three')) {
            return 'three-core';
          }

          if (id.includes('node_modules/gsap') || id.includes('node_modules/zustand')) {
            return 'motion';
          }

          return null;
        },
      },
    },
  },
});
