import { defineConfig } from 'vite';

export default defineConfig({
    base: '/',
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            format: {
                comments: false,
            },
        },
        cssMinify: true,
        rollupOptions: {
            input: {
                main: './index.html',
                developers: './developers.html',
                terms: './terms.html',
                privacy: './privacy.html'
            },
            output: {
                manualChunks: {
                    ethers: ['ethers'],
                },
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
            },
        },
        chunkSizeWarningLimit: 600,
    },
    server: {
        port: 3000,
        open: true,
        cors: true
    },
    preview: {
        port: 4173
    }
});
