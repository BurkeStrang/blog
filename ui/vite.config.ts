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
    rollupOptions: {
      onwarn(warning, warn) {
        // Fail build on warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') {
          return;
        }
        warn(warning);
      },
    },
  },
});
