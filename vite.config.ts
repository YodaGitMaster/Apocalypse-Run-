import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
    plugins: [react(), wasm(), topLevelAwait()],
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    server: {
        port: 3000,
        host: true,
        fs: {
            allow: ['..']
        }
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        sourcemap: true
    },
    optimizeDeps: {
        include: ['three', 'bitecs'],
        exclude: ['@dimforge/rapier3d']
    },
    worker: {
        format: 'es'
    }
});
