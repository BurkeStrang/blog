import { buildTheme } from "./build";
import { palette } from "./tokens";

const built = buildTheme(palette);

export const tokens = built.tokens;
export const themeVarsCss = built.css;
