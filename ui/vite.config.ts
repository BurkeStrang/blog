import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import eslint from "vite-plugin-eslint";

export default defineConfig({
  plugins: [
    react(),
    eslint({
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['node_modules', 'dist'],
      failOnError: true,
      failOnWarning: false,
      emitError: true,
      emitWarning: true,
      cache: false, // Disable cache for consistency
    }),
  ],
  assetsInclude: ["**/*.ktx2"],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ["three", "@react-three/fiber"],
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB for Three.js
    rollupOptions: {
      onwarn(warning, warn) {
        // Fail build on warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          // Separate Three.js into its own chunk
          'three-vendor': ['three'],
          'react-three': ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          'ui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom']
        }
      }
    },
  },
});
