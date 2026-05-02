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
  fogColor: 0x001028,
  clearColor: 0x00030a,
  ambientLightColor: 0x00034d,
  sky: {
    turbidity: 10,
    rayleigh: 0.4,
    mieCoefficient: 0,
    mieDirectionalG: 0.6,
    elevation: 1,
    azimuth: 138,
    exposure: 0.69,
    showSunDisc: 0,
  },
  clouds: {
    cloudCoverage: 0.4,
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
  ambientSceneIntensity: 8.0,
  hemisphereLightIntensity: 6.0,
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
  fogColor: 0x7ec8e3,
  clearColor: 0x87ceeb,
  ambientLightColor: 0xaaddff,
  sky: {
    turbidity: 1,
    rayleigh: 6,
    mieCoefficient: 0.05,
    mieDirectionalG: 0.4,
    elevation: 18,
    azimuth: -100,
    exposure: 1,
    showSunDisc: 0,
  },
  clouds: {
    cloudCoverage: 0.32,
    cloudDensity: 0.24,
    cloudElevation: 1,
  },
  waterColor: 0x3a8090,
  sunColor: 0x02ffff,
  sceneLightColor: 0xffffff,
  sceneGroundColor: 0xffffff,
  mainLightIntensity: 2.2,
  fillLightIntensity: 2.2,
  frontLightIntensity: 2.2,
  rimLightIntensity: 2.5,
  ambientSceneIntensity: 1.8,
  hemisphereLightIntensity: 2.3,
  cubeBodyColor: 0xfffff,
  cubeMetalness: 0.55,
  cubeRoughness: 0.4,
  cubeEnvMapIntensity: 0.5,
  cubeBackdropColor: 0xffffff,
  cubeBackdropOpacity: 0.9,
  accentColor: 0x00cccc,
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
