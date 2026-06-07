import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules/**", "build/**", "dist/**", "public/basis/**"],
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { jsxRuntime: "automatic" },
    },
  },
  // JavaScript files - use prop-types
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { react: pluginReact },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "error",
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            // react-three-fiber custom props:
            "attach", "args", "dispose", "position", "rotation", "intensity",
            "color", "fov", "near", "far", "ref", "onCreated", "object",
            "material", "geometry", "groundColor", "castShadow",
            // material props
            "map", "transparent", "opacity", "depthWrite", "fog", "side",
            "wireframe", "vertexColors", "blending", "depthTest",
            // mesh / object3d props
            "renderOrder", "receiveShadow", "visible", "frustumCulled",
            // canvas / scene props
            "linear", "frameloop", "shadows", "flat",
          ],
        },
      ],
    },
  },
  // TypeScript files - disable prop-types (use TypeScript types instead)
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    plugins: {
      react: pluginReact,
      "react-compiler": reactCompiler,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off", // TypeScript provides type checking
      "react-compiler/react-compiler": "error",
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            // react-three-fiber custom props:
            "attach", "args", "dispose", "position", "rotation", "intensity",
            "color", "fov", "near", "far", "ref", "onCreated", "object",
            "material", "geometry", "groundColor", "castShadow",
            // material props
            "map", "transparent", "opacity", "depthWrite", "fog", "side",
            "wireframe", "vertexColors", "blending", "depthTest",
            // mesh / object3d props
            "renderOrder", "receiveShadow", "visible", "frustumCulled",
            // canvas / scene props
            "linear", "frameloop", "shadows", "flat",
          ],
        },
      ],
    },
  },
  // Mirror babel plugin exclusion: react-compiler is not run on these paths,
  // so its lint rule shouldn't apply either (see vite.config.ts).
  {
    files: [
      "src/engine/**/*.{ts,tsx}",
      "src/shared/contexts/**/*.{ts,tsx}",
      "src/shared/services/**/*.{ts,tsx}",
      "src/shared/theme/**/*.{ts,tsx}",
      "src/features/*/api.ts",
      "src/features/*/model.ts",
      "src/**/MarkdownContent.{ts,tsx}",
    ],
    rules: {
      "react-compiler/react-compiler": "off",
    },
  },
  // Feature boundaries: a feature can import from its own folder and from
  // shared/, but it can only reach into a sibling feature via that feature's
  // public index (e.g. `../posts`), not via internal files (`../posts/ui/X`).
  // Keep the alternation in sync with the folders under src/features/.
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^\\.\\.(?:/\\.\\.)*/(auth|comments|layout|ocean|pages|posts)/.+$",
          message: "Import sibling features through their public index (e.g. `../posts`), not internal paths. Add to features/<name>/index.ts if it should be public.",
        }],
      }],
    },
  },
]);
