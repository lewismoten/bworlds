import * as THREE from 'three';

type TwilightPaletteLike = {
  skyColor: string;
  fogColor: string;
};

type SkyLightingStateInput = {
  sky: {
    dayColor?: string;
    nightColor?: string;
    fogNightColor?: string;
  };
  twilightPalette: TwilightPaletteLike;
  lighting: {
    ambientDayColor?: string;
    groundDayColor?: string;
    sunColor?: string;
  };
  defaults: {
    daySkyColor: string;
    nightSkyColor: string;
    fogNightColor: string;
    ambientDayColor: string;
    groundDayColor: string;
    sunColor: string;
  };
};

export type SkyLightingColorState = {
  daySkyColor: THREE.Color;
  sunsetSkyColor: THREE.Color;
  nightSkyColor: THREE.Color;
  twilightFogColor: THREE.Color;
  nightFogColor: THREE.Color;
  ambientDayColor: THREE.Color;
  groundDayColor: THREE.Color;
  sunDayColor: THREE.Color;
};

export function createSkyLightingColorState(): SkyLightingColorState {
  return {
    daySkyColor: new THREE.Color(),
    sunsetSkyColor: new THREE.Color(),
    nightSkyColor: new THREE.Color(),
    twilightFogColor: new THREE.Color(),
    nightFogColor: new THREE.Color(),
    ambientDayColor: new THREE.Color(),
    groundDayColor: new THREE.Color(),
    sunDayColor: new THREE.Color(),
  };
}

export function updateSkyLightingColorState(
  state: SkyLightingColorState,
  input: SkyLightingStateInput
): SkyLightingColorState {
  state.daySkyColor.set(input.sky.dayColor ?? input.defaults.daySkyColor);
  state.sunsetSkyColor.set(input.twilightPalette.skyColor);
  state.nightSkyColor.set(input.sky.nightColor ?? input.defaults.nightSkyColor);
  state.twilightFogColor.set(input.twilightPalette.fogColor);
  state.nightFogColor.set(
    input.sky.fogNightColor ?? input.defaults.fogNightColor
  );
  state.ambientDayColor.set(
    input.lighting.ambientDayColor ?? input.defaults.ambientDayColor
  );
  state.groundDayColor.set(
    input.lighting.groundDayColor ?? input.defaults.groundDayColor
  );
  state.sunDayColor.set(input.lighting.sunColor ?? input.defaults.sunColor);
  return state;
}
