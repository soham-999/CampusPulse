import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './', // Use relative paths for assets
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                events: resolve(__dirname, 'events.html'),
                faq: resolve(__dirname, 'faq.html'),
                vision: resolve(__dirname, 'vision.html'),
            },
        },
    },
    publicDir: 'public', // Ensure public assets are copied
});
