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
  sphereArrowAccentColor: number;
}

export const DARK_SCENE_THEME: SceneTheme = {
  background: '#4a4a4e',
  fogColor: 0x1a1a2e,
  clearColor: 0x060610,
  ambientLightColor: 0x223355,
  sky: {
    turbidity: 20,
    rayleigh: 0.2,
    mieCoefficient: 0,
    mieDirectionalG: 0.9,
    elevation: 5,
    azimuth: 130,
    exposure: 0.6,
    showSunDisc: 0,
  },
  clouds: {
    cloudCoverage: 0.22,
    cloudDensity: 0.29,
    cloudElevation: 0.8,
  },
  waterColor: 0x1a1a3a,
  sunColor: 0x3333aa,
  sceneLightColor: 0xffbbff,
  sceneGroundColor: 0xffccff,
  mainLightIntensity: 0.2,
  fillLightIntensity: 2.0,
  frontLightIntensity: 2.4,
  rimLightIntensity: 3.0,
  ambientSceneIntensity: 2.0,
  hemisphereLightIntensity: 3.0,
  cubeBodyColor: 0x6a8a6a,
  cubeMetalness: 0.8,
  cubeRoughness: 0.6,
  cubeEnvMapIntensity: 0.4,
  cubeBackdropColor: 0x202020,
  cubeBackdropOpacity: 0.9,
  accentColor: 0x00ffff,
  sphereBodyColor: 0x4a6a4a,
  sphereMetalness: 0.8,
  sphereRoughness: 0.9,
  sphereEnvMapIntensity: 0.9,
  sphereGlowColor: 0xaabbcc,
  sphereGlowOpacity: 0.10,
  sphereArrowAccentColor: 0x11b9aa,
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
    elevation: 10,
    azimuth: -100,
    exposure: 1,
    showSunDisc: 1,
  },
  clouds: {
    cloudCoverage: 0.22,
    cloudDensity: 0.14,
    cloudElevation: 1,
  },
  waterColor: 0x3a8090,
  sunColor: 0x02ffff,
  sceneLightColor: 0xffffff,
  sceneGroundColor: 0xffffff,
  mainLightIntensity: 0.2,
  fillLightIntensity: 0.8,
  frontLightIntensity: 0.9,
  rimLightIntensity: 2.5,
  ambientSceneIntensity: 0.8,
  hemisphereLightIntensity: 3.3,
  cubeBodyColor: 0xfffff,
  cubeMetalness: 0.8,
  cubeRoughness: 0.99,
  cubeEnvMapIntensity: 0.4,
  cubeBackdropColor: 0xcfcfcf,
  cubeBackdropOpacity: 0.9,
  accentColor: 0x007a7a,
  sphereBodyColor: 0xcfcfcf,
  sphereMetalness: 0.3,
  sphereRoughness: 0.3,
  sphereEnvMapIntensity: 0,
  sphereGlowColor: 0xaabbcc,
  sphereGlowOpacity: 0.18,
  sphereArrowAccentColor: 0x007755,
};

export function getSceneTheme(isDark: boolean): SceneTheme {
  return isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;
}
