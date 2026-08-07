/**
 * Theme tokens — the single source of truth for color variables.
 *
 * Each leaf is { dark, light }. `buildTheme(palette)` (see ./build) walks
 * the tree once to produce both:
 *   - a typed `tokens` object whose leaves are `var(--color-<path>)` strings
 *   - a CSS string that defines those custom properties under
 *     `:root, [data-theme="dark"]` and `[data-theme="light"]`
 *
 * Token path → CSS variable name conversion: each path segment is
 * lower-camel; the joined kebab form prefixed with `--color-` is the var
 * name. e.g. `palette.comment.bgHover` ↔ `--color-comment-bg-hover`.
 *
 * To add a token: add a leaf below, then use `tokens.<path>` at the call
 * site. The variable is automatically defined for both themes.
 */
export const palette = {
  comment: {
    bg:          { dark: "rgba(255, 255, 255, 0.02)", light: "rgba(0, 0, 0, 0.04)" },
    bgHover:     { dark: "rgba(255, 255, 255, 0.04)", light: "rgba(0, 0, 0, 0.07)" },
    border:      { dark: "rgba(255, 255, 255, 0.1)",  light: "rgba(0, 0, 0, 0.15)" },
    borderHover: { dark: "rgba(255, 255, 255, 0.15)", light: "rgba(0, 0, 0, 0.25)" },
  },
  md: {
    h1Border:         { dark: "rgba(0, 255, 255, 0.2)",   light: "rgba(0, 100, 120, 0.35)" },
    h2Border:         { dark: "rgba(0, 255, 255, 0.1)",   light: "rgba(0, 100, 120, 0.2)" },
    accent:           { dark: "rgba(0, 170, 170, 0.62)",  light: "#0aa" },
    accentSoft:       { dark: "rgba(0, 170, 170, 0.045)", light: "rgba(0, 170, 170, 0.07)" },
    accentSoftStrong: { dark: "rgba(0, 170, 170, 0.09)",  light: "rgba(0, 170, 170, 0.16)" },
    accentShadow:     { dark: "rgba(0, 170, 170, 0.14)",  light: "rgba(0, 170, 170, 0.22)" },
    link:             { dark: "#4A7BA7",                  light: "#1a6b8a" },
    linkHover:        { dark: "#3D5E8C",                  light: "#0f4f6a" },
    hr:               { dark: "rgba(255, 255, 255, 0.1)", light: "rgba(0, 0, 0, 0.1)" },
    blockquote: {
      border: { dark: "rgba(255, 255, 255, 0.2)", light: "rgba(0, 0, 0, 0.2)" },
      bg:     { dark: "rgba(255, 255, 255, 0.02)", light: "rgba(0, 0, 0, 0.04)" },
      text:   { dark: "rgba(255, 255, 255, 0.6)",  light: "rgba(0, 0, 0, 0.6)" },
    },
    table: {
      // NB: thBg and trHover were `--color-md-th-bg` / `--color-md-tr-hover` before; the
      // generated names are now `--color-md-table-th-bg` / `--color-md-table-tr-hover`.
      bg:      { dark: "rgba(255, 255, 255, 0.02)", light: "rgba(0, 0, 0, 0.02)" },
      border:  { dark: "rgba(255, 255, 255, 0.1)",  light: "rgba(0, 0, 0, 0.1)" },
      thBg:    { dark: "rgba(255, 255, 255, 0.05)", light: "rgba(0, 0, 0, 0.05)" },
      trHover: { dark: "rgba(255, 255, 255, 0.03)", light: "rgba(0, 0, 0, 0.03)" },
    },
    code: {
      bg:             { dark: "rgba(18, 20, 20, 0.95)",    light: "rgba(205, 205, 211, 0.88)" },
      border:         { dark: "rgba(190, 190, 190, 0.08)", light: "rgba(0, 0, 0, 0.12)" },
      glassHighlight: { dark: "rgba(20, 20, 20, 0.2)",     light: "rgba(255, 255, 255, 0.15)" },
      inset:          { dark: "rgba(200, 200, 200, 0.01)", light: "rgba(255, 255, 255, 0.15)" },
      shadow:         { dark: "rgba(200, 200, 200, 0.04)", light: "rgba(0, 0, 0, 0.08)" },
      text:           { dark: "#8E878E", light: "#556473" },
      comment:        { dark: "#5E6466", light: "#74797a" },
      function:       { dark: "#6588A1", light: "#52738a" },
      keyword:        { dark: "#6DA7A0", light: "#507e79" },
      number:         { dark: "#6588A1", light: "#52738a" },
      operator:       { dark: "#6588A1", light: "#52738a" },
      property:       { dark: "#6588A1", light: "#52738a" },
      punctuation:    { dark: "#3F684E", light: "#637568" },
      string:         { dark: "#68685E", light: "#666750" },
      tag:            { dark: "#867EA9", light: "#574f6e" },
      attribute:      { dark: "#6DA7A0", light: "#507e79" },
      builtin:        { dark: "#6588A1", light: "#52738a" },
      deleted:        { dark: "#B06E6E", light: "#986363" },
      entity:         { dark: "#6DA7A0", light: "#507e79" },
      inserted:       { dark: "#68685E", light: "#666750" },
      namespace:      { dark: "#6588A1", light: "#52738a" },
      regex:          { dark: "#6DA7A0", light: "#507e79" },
      type:           { dark: "#68685E", light: "#666750" },
      variable:       { dark: "#8E878E", light: "#696469" },
    },
  },
} as const;
