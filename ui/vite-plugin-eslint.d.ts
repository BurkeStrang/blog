declare module "vite-plugin-eslint" {
  import type { Plugin } from "vite";
  
  interface ESLintOptions {
    include?: string | string[];
    exclude?: string | string[];
    failOnError?: boolean;
    failOnWarning?: boolean;
    emitError?: boolean;
    emitWarning?: boolean;
    cache?: boolean;
  }
  
  function eslint(options?: ESLintOptions): Plugin;
  export default eslint;
}