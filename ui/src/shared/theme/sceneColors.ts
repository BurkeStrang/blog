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
  sphereLabelOpacity: number;
}

export const DARK_SCENE_THEME: SceneTheme = {
  background: '#0b0c1f',
  fogColor: 0x111028,
  clearColor: 0x11030a,
  ambientLightColor: 0x11034d,
  sky: {
    turbidity: 10,
    rayleigh: 5.7,
    mieCoefficient: 0,
    mieDirectionalG: 0.9,
    elevation: 1.9,
    azimuth: 158,
    exposure: 0.99,
    showSunDisc: 0,
  },
  clouds: {
    cloudScale: 0.0003,
    cloudCoverage: 0.41,
    cloudDensity: 0.69,
    cloudElevation: 0.1,
  },
  waterColor: 0x000055,
  sunColor: 0x0000aa,
  sceneLightColor: 0x000011,
  sceneGroundColor: 0x0000aa,
  mainLightIntensity: 4.2,
  fillLightIntensity: 1.0,
  frontLightIntensity: 5.4,
  rimLightIntensity: 1.0,
  ambientSceneIntensity: 3.0,
  hemisphereLightIntensity: 5.0,
  cubeBodyColor: 0x6a8a6a,
  cubeMetalness: 0.99,
  cubeRoughness: 0.6,
  cubeEnvMapIntensity: 0.1,
  cubeBackdropColor: 0x202020,
  cubeBackdropOpacity: 0.96,
  accentColor: 0x00aaaa, // not used for labels
  sphereBodyColor: 0x6a8a6a,
  sphereMetalness: 0.93,
  sphereRoughness: 0.6,
  sphereEnvMapIntensity: 12.7,
  sphereGlowColor: 0x00aaaa,
  sphereGlowOpacity: 0.10,
  sphereArrowBodyColor: 0x008888,
  sphereArrowBodyOpacity: 0.8,
  sphereArrowAccentColor: 0x00aaaa,
  sphereArrowAccentOpacity: 1.0,
  sphereLabelBackdropColor: 0x202020,
  sphereLabelBackdropOpacity: 1.0,
  sphereLabelOpacity: 1.0,
};

export const LIGHT_SCENE_THEME: SceneTheme = {
  background: '#fff1f1',
  fogColor: 0xf1f1f1,
  clearColor: 0xf1f1f1,
  ambientLightColor: 0xf1f1f1,
  sky: {
    turbidity: 9.45,
    rayleigh: 12,
    mieCoefficient: 0.01,
    mieDirectionalG: 1,
    elevation: 17,
    azimuth: 13,
    exposure: 0.8,
    showSunDisc: 0,
  },
  clouds: {
    cloudScale: 0.0001,
    cloudCoverage: 0.22,
    cloudDensity: 0.31,
    cloudElevation: 0.92,
  },
  waterColor: 0xc1c1c1,
  sunColor: 0x0fffff,
  sceneLightColor: 0xffffff,
  sceneGroundColor: 0xffffff,
  mainLightIntensity: 2.2,
  fillLightIntensity: 5.2,
  frontLightIntensity: 4.2,
  rimLightIntensity: 8.5,
  ambientSceneIntensity: 9.8,
  hemisphereLightIntensity: 5.3,
  cubeBodyColor: 0xd7d9dc,
  cubeMetalness: 0.55,
  cubeRoughness: 0.52,
  cubeEnvMapIntensity: 0.5,
  cubeBackdropColor: 0x939596,
  cubeBackdropOpacity: 0.85,
  accentColor: 0x101010,
  sphereBodyColor: 0xffffff,
  sphereMetalness: 0.65,
  sphereRoughness: 0.4,
  sphereEnvMapIntensity: 0.1,
  sphereGlowColor: 0x9a9a9a,
  sphereGlowOpacity: 0.3,
  sphereArrowBodyColor: 0x007a7a,
  sphereArrowBodyOpacity: 0.85,
  sphereArrowAccentColor: 0x00dddd,
  sphereArrowAccentOpacity: 1.0,
  sphereLabelBackdropColor: 0xffffff,
  sphereLabelBackdropOpacity: 0.4,
  sphereLabelOpacity: 0.5,
};

export function getSceneTheme(isDark: boolean): SceneTheme {
  return isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;
}
