import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    server: {
        port: 3000,
        host: true
    },
    build: {
        target: 'esnext',
        outDir: 'dist'
    }
});
