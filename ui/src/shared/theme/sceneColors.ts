export interface SkyParams {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  elevation: number;
  azimuth: number;
  exposure: number;
  showSunDisc: number; // 0 = hidden, 1 = visible
}

export interface CloudParams {
  cloudScale: number;
  cloudCoverage: number;
  cloudDensity: number;
  cloudElevation: number; // 0-1, maps to world Y position (300 + val * 700)
}

export interface SceneTheme {
  // Environment
  background: string;
  fogColor: number;
  clearColor: number;
  ambientLightColor: number;
  sky: SkyParams;
  clouds: CloudParams;

  // Water
  waterColor: number;
  sunColor: number;

  // Scene lights
  sceneLightColor: number;
  sceneGroundColor: number;
  mainLightIntensity: number;
  fillLightIntensity: number;
  frontLightIntensity: number;
  rimLightIntensity: number;
  ambientSceneIntensity: number;
  hemisphereLightIntensity: number;

  // PostCube
  cubeBodyColor: number;
  cubeMetalness: number;
  cubeRoughness: number;
  cubeEnvMapIntensity: number;
  cubeBackdropColor: number;
  cubeBackdropOpacity: number;

  // Shared accent (text on cubes and sphere)
  accentColor: number;

  // Navigation sphere
  sphereBodyColor: number;
  sphereMetalness: number;
  sphereRoughness: number;
  sphereEnvMapIntensity: number;
  sphereGlowColor: number;
  sphereGlowOpacity: number;
  sphereArrowBodyColor: number;
  sphereArrowBodyOpacity: number;
  sphereArrowAccentColor: number;
  sphereArrowAccentOpacity: number;
  sphereLabelBackdropColor: number;
  sphereLabelBackdropOpacity: number;
}

export const DARK_SCENE_THEME: SceneTheme = {
  background: '#0b0c1f',
  fogColor: 0x111028,
  clearColor: 0x11030a,
  ambientLightColor: 0x11034d,
  sky: {
    turbidity: 30,
    rayleigh: 0.6,
    mieCoefficient: 0,
    mieDirectionalG: 0.6,
    elevation: 0.5,
    azimuth: 138,
    exposure: 0.69,
    showSunDisc: 0,
  },
  clouds: {
    cloudScale: 0.001,
    cloudCoverage: 0.2,
    cloudDensity: 0.49,
    cloudElevation: 0.4,
  },
  waterColor: 0x113a5c,
  sunColor: 0x110a6a,
  sceneLightColor: 0x0a8fd6,
  sceneGroundColor: 0x0d6fb5,
  mainLightIntensity: 3.2,
  fillLightIntensity: 2.0,
  frontLightIntensity: 1.4,
  rimLightIntensity: 3.0,
  ambientSceneIntensity: 10.0,
  hemisphereLightIntensity: 10.0,
  cubeBodyColor: 0x6a8a6a,
  cubeMetalness: 0.9,
  cubeRoughness: 0.7,
  cubeEnvMapIntensity: 0.9,
  cubeBackdropColor: 0x202020,
  cubeBackdropOpacity: 0.9,
  accentColor: 0x00aaaa,
  sphereBodyColor: 0x6a8a6a,
  sphereMetalness: 0.86,
  sphereRoughness: 0.6,
  sphereEnvMapIntensity: 0.7,
  sphereGlowColor: 0x000002,
  sphereGlowOpacity: 0.10,
  sphereArrowBodyColor: 0x00aaaa,
  sphereArrowBodyOpacity: 0.35,
  sphereArrowAccentColor: 0x00aaaa,
  sphereArrowAccentOpacity: 1.0,
  sphereLabelBackdropColor: 0x202020,
  sphereLabelBackdropOpacity: 0.9,
};

export const LIGHT_SCENE_THEME: SceneTheme = {
  background: '#fff1f1',
  fogColor: 0xf1f1f1,
  clearColor: 0xf1f1f1,
  ambientLightColor: 0xf1f1f1,
  sky: {
    turbidity: 0.45,
    rayleigh: 20,
    mieCoefficient: 0.01,
    mieDirectionalG: 1,
    elevation: 20,
    azimuth: 13,
    exposure: 1,
    showSunDisc: 0,
  },
  clouds: {
    cloudScale: 0.0009,
    cloudCoverage: 0.42,
    cloudDensity: 0.28,
    cloudElevation: 0.92,
  },
  waterColor: 0xf1f1f1,
  sunColor: 0xf1f1f1,
  sceneLightColor: 0xf1f1f1,
  sceneGroundColor: 0xf1f1f1,
  mainLightIntensity: 2.2,
  fillLightIntensity: 5.2,
  frontLightIntensity: 4.2,
  rimLightIntensity: 8.5,
  ambientSceneIntensity: 9.8,
  hemisphereLightIntensity: 0.3,
  cubeBodyColor: 0xfffff,
  cubeMetalness: 0.8,
  cubeRoughness: 0.4,
  cubeEnvMapIntensity: 8.5,
  cubeBackdropColor: 0xffffff,
  cubeBackdropOpacity: 0.9,
  accentColor: 0x006666,
  sphereBodyColor: 0xffffff,
  sphereMetalness: 0.55,
  sphereRoughness: 0.4,
  sphereEnvMapIntensity: 0.1,
  sphereGlowColor: 0x9a9a9a,
  sphereGlowOpacity: 0.3,
  sphereArrowBodyColor: 0x007a7a,
  sphereArrowBodyOpacity: 0.85,
  sphereArrowAccentColor: 0x007755,
  sphereArrowAccentOpacity: 1.0,
  sphereLabelBackdropColor: 0xffffff,
  sphereLabelBackdropOpacity: 0.4,
};

export function getSceneTheme(isDark: boolean): SceneTheme {
  return isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;
}
