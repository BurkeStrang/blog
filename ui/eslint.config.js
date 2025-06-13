import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules/**", "build/**", "dist/**"],
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
            "attach",
            "args",
            "dispose",
            "position",
            "rotation",
            "intensity",
            "color",
            "fov",
            "near",
            "far",
            "ref",
            "onCreated",
            "object",
            "material",
            "geometry",
            "groundColor",
            "castShadow"
          ],
        },
      ],
    },
  },
  // TypeScript files - disable prop-types (use TypeScript types instead)
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    plugins: { react: pluginReact },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off", // TypeScript provides type checking
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            // react-three-fiber custom props:
            "attach",
            "args",
            "dispose",
            "position",
            "rotation",
            "intensity",
            "color",
            "fov",
            "near",
            "far",
            "ref",
            "onCreated",
            "object",
            "material",
            "geometry",
            "groundColor",
            "castShadow"
          ],
        },
      ],
    },
  },
]);
