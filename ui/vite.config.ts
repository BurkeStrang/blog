import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import eslint from "vite-plugin-eslint";
import { visualizer } from "rollup-plugin-visualizer";
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { gzipSync, brotliCompressSync, constants } from "zlib";

// Custom plugin to copy GLTF textures and fix bin file references
// Plugin to exclude models folder from public assets
const excludeModelsPlugin = () => ({
  name: 'exclude-models',
  writeBundle() {
    const modelsPath = join(process.cwd(), 'dist', 'models');
    if (existsSync(modelsPath)) {
      rmSync(modelsPath, { recursive: true, force: true });
      console.log(`🗑️ Removed models folder from build output`);
    }
  }
});

const gltfTexturePlugin = () => ({
  name: 'gltf-texture-copy',
  writeBundle() {
    const assetsDir = join(process.cwd(), 'dist', 'assets');
    const srcModelsDir = join(process.cwd(), 'src', 'assets', 'models');
    
    // Create assets/textures directory
    const assetsTexturesDir = join(assetsDir, 'textures');
    if (!existsSync(assetsTexturesDir)) {
      mkdirSync(assetsTexturesDir, { recursive: true });
    }

    // Copy sphere textures and bin file from src/assets
    const sphereDir = join(srcModelsDir, 'sphere');
    if (existsSync(sphereDir)) {
      // Copy textures
      const sphereTextures = [
        'Sphere_baseColor_compressed.webp',
        'Sphere_metallicRoughness_compressed.webp', 
        'Sphere_normal_compressed.webp'
      ];
      
      sphereTextures.forEach(texture => {
        const src = join(sphereDir, 'textures', texture);
        const dest = join(assetsTexturesDir, texture);
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`✅ Copied ${texture} to assets/textures/`);
        }
      });

      // Copy and rename sphere bin file
      const sphereBinSrc = join(sphereDir, 'scene.bin');
      const sphereBinDest = join(assetsDir, 'sphere.bin');
      if (existsSync(sphereBinSrc)) {
        copyFileSync(sphereBinSrc, sphereBinDest);
        console.log(`✅ Copied sphere.bin to assets/`);
      }
    }

    // Copy rubiks cube textures and bin file from src/assets
    const cubeDir = join(srcModelsDir, 'rubikscube');
    if (existsSync(cubeDir)) {
      // Copy textures
      const cubeTextures = [
        'Sticker_SPC-SM_baseColor_compressed.webp',
        'Sticker_SPC-SM_metallicRoughness_compressed.webp'
      ];
      
      cubeTextures.forEach(texture => {
        const src = join(cubeDir, 'textures', texture);
        const dest = join(assetsTexturesDir, texture);
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`✅ Copied ${texture} to assets/textures/`);
        }
      });

      // Copy and rename cube bin file
      const cubeBinSrc = join(cubeDir, 'scene.bin');
      const cubeBinDest = join(assetsDir, 'cube.bin');
      if (existsSync(cubeBinSrc)) {
        copyFileSync(cubeBinSrc, cubeBinDest);
        console.log(`✅ Copied cube.bin to assets/`);
      }
    }

    // Walk every emitted .gltf and rewrite its "uri": "scene.bin" to the
    // dist-renamed bin (sphere.bin / cube.bin), matched by gltf content. Vite
    // hashes the gltf filename based on content, so we can't pin a specific
    // hash — we identify each model by a stable substring of its embedded
    // metadata (sketchfab author URLs differ between the two models).
    for (const fileName of readdirSync(assetsDir)) {
      if (!fileName.endsWith('.gltf')) continue;
      const gltfPath = join(assetsDir, fileName);
      let gltf = readFileSync(gltfPath, 'utf8');
      if (!gltf.includes('"uri": "scene.bin"')) continue;
      let renamedTo: string | null = null;
      if (gltf.includes('renandesign3d') || gltf.includes('PreviewSphere')) {
        renamedTo = 'sphere.bin';
      } else if (gltf.includes('SonnyG1') || gltf.includes('rubikscube')) {
        renamedTo = 'cube.bin';
      }
      if (!renamedTo) {
        console.warn(`⚠️  Could not identify ${fileName} — left scene.bin reference intact`);
        continue;
      }
      gltf = gltf.replace('"uri": "scene.bin"', `"uri": "${renamedTo}"`);
      writeFileSync(gltfPath, gltf);
      console.log(`✅ Rewrote ${fileName} → ${renamedTo}`);
    }
  }
});

// Plugin that injects <link rel="preload"> tags for critical 3D assets
// (font JSON, water normal, GLTF + bin files) so they start streaming as
// soon as the HTML lands, in parallel with the JS bundle. Asset filenames
// are hashed by Vite, so the plugin discovers them from the bundle output.
const preloadCriticalAssetsPlugin = () => ({
  name: 'preload-critical-assets',
  transformIndexHtml: {
    order: 'post' as const,
    handler(html: string, ctx: { bundle?: Record<string, { fileName: string }> }) {
      if (!ctx.bundle) return html;
      const preloads: string[] = [];
      for (const fileName of Object.keys(ctx.bundle)) {
        const href = '/' + fileName;
        if (fileName.endsWith('.gltf')) {
          preloads.push(`<link rel="preload" href="${href}" as="fetch" type="model/gltf+json" crossorigin>`);
        } else if (fileName.endsWith('.avif') && fileName.includes('waternormals')) {
          // crossorigin must be present because TextureCompressor fetches with CORS;
          // without it the preload doesn't match and the browser refetches.
          preloads.push(`<link rel="preload" href="${href}" as="image" type="image/avif" crossorigin>`);
        } else if (fileName.endsWith('.json') && fileName.toLowerCase().includes('noto sans')) {
          preloads.push(`<link rel="preload" href="${href}" as="fetch" type="application/json" crossorigin>`);
        }
      }
      // bin files have stable names (set by gltfTexturePlugin), not hashed
      preloads.push(`<link rel="preload" href="/assets/sphere.bin" as="fetch" crossorigin>`);
      preloads.push(`<link rel="preload" href="/assets/cube.bin" as="fetch" crossorigin>`);
      if (preloads.length === 0) return html;
      return html.replace('</head>', `  ${preloads.join('\n  ')}\n  </head>`);
    },
  },
});

// Plugin to generate compressed versions of text files
const compressionPlugin = () => ({
  name: 'compression',
  writeBundle() {
    const distPath = join(process.cwd(), 'dist');
    const compressibleExtensions = ['.js', '.css', '.html', '.json', '.svg', '.txt', '.xml'];
    
    function compressFile(filePath) {
      const content = readFileSync(filePath);
      const relativePath = filePath.replace(distPath, '');
      
      // Create gzip version
      const gzipContent = gzipSync(content, { level: 9 });
      writeFileSync(filePath + '.gz', gzipContent);
      
      // Create brotli version  
      const brotliContent = brotliCompressSync(content, { 
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: content.length
        }
      });
      writeFileSync(filePath + '.br', brotliContent);
      
      const originalSize = content.length;
      const gzipSize = gzipContent.length;
      const brotliSize = brotliContent.length;
      const gzipSavings = ((originalSize - gzipSize) / originalSize * 100).toFixed(1);
      const brotliSavings = ((originalSize - brotliSize) / originalSize * 100).toFixed(1);
      
      console.log(`📦 ${relativePath}: ${originalSize} → gzip: ${gzipSize} (${gzipSavings}%) → brotli: ${brotliSize} (${brotliSavings}%)`);
    }
    
    function walkDirectory(dir) {
      const files = readdirSync(dir);
      
      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDirectory(filePath);
        } else if (stat.isFile()) {
          const ext = file.substring(file.lastIndexOf('.'));
          if (compressibleExtensions.includes(ext)) {
            compressFile(filePath);
          }
        }
      }
    }
    
    console.log('\n🗜️  Generating compressed files:');
    walkDirectory(distPath);
  }
});

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Enable React Compiler for automatic memoization
          ["babel-plugin-react-compiler", {
            compilationMode: "all", // Start with annotation mode for safer adoption
            sources: (filename: string | string[]) => {
              // Exclude engine utilities, services, and shared contexts from React Compiler optimization
              return !filename.includes('/engine/') &&
                     !filename.includes('/shared/contexts/') &&
                     !filename.includes('/services/') &&
                     !filename.includes('/cache/') &&
                     !filename.includes('MarkdownContent');
            }
          }]
        ]
      }
    }),
    eslint({
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['node_modules', 'dist'],
      failOnError: true,
      failOnWarning: false,
      emitError: true,
      emitWarning: true,
      cache: false, // Disable cache for consistency
    }),
    excludeModelsPlugin(),
    gltfTexturePlugin(),
    preloadCriticalAssetsPlugin(),
    compressionPlugin(),
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: "dist/stats.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true,
            open: true,
          }),
        ]
      : []),
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
  preview: {
    port: 3000,
    open: true,
  },

  optimizeDeps: {
    include: ["three", "@react-three/fiber"],
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB for Three.js
    // Don't inline 3D model / texture / font assets as base64 data URLs, even if
    // they fall under the 4KB default. Inlined gltf data URLs can't resolve
    // sibling .bin references, and preload hints can't target data URLs.
    assetsInlineLimit: (filePath: string) =>
      /\.(gltf|glb|bin|avif|webp|woff2?|ttf|json)$/.test(filePath) ? false : undefined,
    rollupOptions: {
      onwarn(warning, warn) {
        // Fail build on warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          // Three.js core (excluding @react-three/*)
          if (/[\\/]three[\\/]/.test(id) && !/@react-three/.test(id)) return 'three-vendor';
          // @react-three/* + fiber-only deps (zustand, its-fine, react-reconciler).
          // NOTE: scheduler stays with React core below — it shares internal state
          // with react/react-dom and splitting it causes runtime init errors.
          if (/@react-three[\\/]/.test(id)) return 'react-three';
          if (/[\\/](zustand|its-fine|react-reconciler)[\\/]/.test(id)) return 'react-three';
          // MUI / emotion
          if (/@mui[\\/]|@emotion[\\/]/.test(id)) return 'ui-vendor';
          // React core — keep react, react-dom, scheduler, and react-router together
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)[\\/]/.test(id)) return 'react-vendor';
        }
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    minify: 'esbuild'
  },
});
