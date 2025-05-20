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
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { react: pluginReact },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
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
