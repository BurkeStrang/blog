/**
 * Walks a token palette (see ./tokens) and produces:
 *   - `tokens`: same shape as the palette, but each leaf becomes the
 *     `var(--color-<kebab-path>)` string so it can be interpolated into
 *     styled-components template literals.
 *   - `css`: a string defining the same custom properties for both themes,
 *     ready to be dropped into a `createGlobalStyle` template.
 */

export interface Leaf {
  dark: string;
  light: string;
}

type IsLeaf<T> = T extends Leaf ? true : false;

export type Resolved<T> = {
  [K in keyof T]: IsLeaf<T[K]> extends true
    ? string
    : T[K] extends object
      ? Resolved<T[K]>
      : never;
};

const isLeaf = (v: unknown): v is Leaf =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Leaf).dark === "string" &&
  typeof (v as Leaf).light === "string";

const camelToKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const varName = (path: string[]) => `--color-${path.map(camelToKebab).join("-")}`;

export function buildTheme<T extends object>(palette: T): {
  tokens: Resolved<T>;
  css: string;
} {
  const dark: string[] = [];
  const light: string[] = [];

  const walk = (node: unknown, path: string[]): unknown => {
    if (isLeaf(node)) {
      const name = varName(path);
      dark.push(`${name}: ${node.dark};`);
      light.push(`${name}: ${node.light};`);
      return `var(${name})`;
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as object)) {
      out[key] = walk(value, [...path, key]);
    }
    return out;
  };

  const tokens = walk(palette, []) as Resolved<T>;

  const css = `
:root,
[data-theme="dark"] {
${dark.map((l) => `  ${l}`).join("\n")}
}

[data-theme="light"] {
${light.map((l) => `  ${l}`).join("\n")}
}
`;

  return { tokens, css };
}
