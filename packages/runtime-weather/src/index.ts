import { createBoundedCache } from '@bworlds/cache-support';
import {
  clamp,
  fract,
  getDaylightCycleState,
  hash2D,
  lerp,
  registerHashLabel,
  smoothstep,
} from '@bworlds/core';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  RuntimePlugin,
  WorldEnvironmentWeatherConditionLike,
  WorldEnvironmentWeatherForecastDayLike,
  WorldEnvironmentWeatherFrontLike,
} from '@bworlds/plugin-api';
import { resolveCelestialCycleConfig } from '@bworlds/runtime-celestial';

const WEATHER_REGION_SIZE = 24;
const FORECAST_DAYS = 7;
const WEATHER_CACHE_LIMIT = 640;
const WEATHER_WIND_EXPOSURE_SEED = registerHashLabel('weather-wind-exposure');
const WEATHER_LIFT_SEED = registerHashLabel('weather-lift');
const WEATHER_FRONT_SEED = registerHashLabel('weather-front-seed');
const WEATHER_FRONT_KIND_SEED = registerHashLabel('weather-front-kind');
const WEATHER_BASIN_SEED = registerHashLabel('weather-basin');
const WEATHER_KIND_LABELS: Record<
  WorldEnvironmentWeatherConditionLike['kind'],
  string
> = {
  clear: 'Clear',
  clouds: 'Clouds',
  wind: 'Wind',
  fog: 'Fog',
  'light-rain': 'Light Rain',
  'heavy-rain': 'Heavy Rain',
  snow: 'Snow',
  hail: 'Hail',
};

const forecastCache = createBoundedCache<
  string,
  WorldEnvironmentWeatherForecastDayLike
>(WEATHER_CACHE_LIMIT);

type WeatherDaySeed = {
  regionX: number;
  regionY: number;
  dayNumber: number;
  yearProgress: number;
  latitudeDegrees: number;
  dayProgress: number;
};

type WeatherProfile = {
  current: WorldEnvironmentWeatherConditionLike;
  forecast: WorldEnvironmentWeatherForecastDayLike[];
};

export function createWeatherRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-weather', {
    resolveWorldEnvironment({ timeMs, state }) {
      const cycleConfig = resolveCelestialCycleConfig(state);
      const resolvedTimeMs = typeof timeMs === 'number' ? timeMs : 0;
      const cycle = getDaylightCycleState(resolvedTimeMs, cycleConfig);
      const weather = resolveWeatherProfile({
        playerX: state.player.x,
        playerY: state.player.y,
        timeMs: resolvedTimeMs,
      });
      const weatherSky = resolveWeatherSkyPalette(weather.current);
      const weatherLighting = resolveWeatherLighting(weather.current);

      return {
        sky: {
          dayColor: weatherSky.dayColor,
          sunsetColor: weatherSky.sunsetColor,
          fogDayColor: weatherSky.fogDayColor,
          fogNightColor: weatherSky.fogNightColor,
        },
        lighting: {
          ambientDayColor: weatherLighting.ambientDayColor,
          groundDayColor: weatherLighting.groundDayColor,
          shadowStrength: weatherLighting.shadowStrength,
        },
        stars: {
          density: clamp(
            1.08 - weather.current.cloudCover * 0.75 - weather.current.precipitation * 0.22,
            0.12,
            1.1
          ),
        },
        weather: {
          current: weather.current,
          forecast: weather.forecast,
        },
        celestial: {
          dateLabel: cycle.calendar.label,
        },
      };
    },
  });
}

export function resolveWeatherProfile(options: {
  playerX: number;
  playerY: number;
  timeMs: number;
}): WeatherProfile {
  const cycleConfig = resolveCelestialCycleConfig({
    player: {
      x: options.playerX,
      y: options.playerY,
    },
  });
  const cycle = getDaylightCycleState(options.timeMs, cycleConfig);
  const regionX = Math.floor(options.playerX / WEATHER_REGION_SIZE);
  const regionY = Math.floor(options.playerY / WEATHER_REGION_SIZE);
  const current = resolveWeatherCondition({
    regionX,
    regionY,
    dayNumber: cycle.dayNumber,
    yearProgress: cycle.yearProgress,
    latitudeDegrees: cycle.observerLatitudeDegrees,
    dayProgress: cycle.dayProgress,
  });
  const forecast: WorldEnvironmentWeatherForecastDayLike[] = [];
  for (let index = 0; index < FORECAST_DAYS; index += 1) {
    const dayTimeMs =
      (cycle.dayNumber + index) * cycleConfig.dayLengthMs + cycleConfig.dayLengthMs * 0.5;
    const dayCycle = getDaylightCycleState(dayTimeMs, cycleConfig);
    forecast.push(resolveForecastDay({
      regionX,
      regionY,
      dayNumber: cycle.dayNumber + index,
      yearProgress: dayCycle.yearProgress,
      latitudeDegrees: dayCycle.observerLatitudeDegrees,
      label:
        index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`,
    }));
  }

  return {
    current,
    forecast,
  };
}

export function resolveForecastDay(options: {
  regionX: number;
  regionY: number;
  dayNumber: number;
  yearProgress: number;
  latitudeDegrees: number;
  label: string;
}): WorldEnvironmentWeatherForecastDayLike {
  const key = [
    options.regionX,
    options.regionY,
    options.dayNumber,
    options.yearProgress.toFixed(4),
    options.latitudeDegrees.toFixed(2),
    options.label,
  ].join(':');
  const cached = forecastCache.get(key);
  if (cached) {
    return cached;
  }

  const dawn = resolveWeatherCondition({
    regionX: options.regionX,
    regionY: options.regionY,
    dayNumber: options.dayNumber,
    yearProgress: options.yearProgress,
    latitudeDegrees: options.latitudeDegrees,
    dayProgress: 0.22,
  });
  const midday = resolveWeatherCondition({
    regionX: options.regionX,
    regionY: options.regionY,
    dayNumber: options.dayNumber,
    yearProgress: options.yearProgress,
    latitudeDegrees: options.latitudeDegrees,
    dayProgress: 0.52,
  });
  const dusk = resolveWeatherCondition({
    regionX: options.regionX,
    regionY: options.regionY,
    dayNumber: options.dayNumber,
    yearProgress: options.yearProgress,
    latitudeDegrees: options.latitudeDegrees,
    dayProgress: 0.78,
  });
  const highTemperature = Math.round(
    Math.max(dawn.temperature, midday.temperature, dusk.temperature)
  );
  const lowTemperature = Math.round(
    Math.min(dawn.temperature, midday.temperature, dusk.temperature)
  );
  const representative = pickRepresentativeCondition([dawn, midday, dusk]);
  const summary = `${representative.label} ${highTemperature}\u00b0/${lowTemperature}\u00b0F`;
  const day = {
    dayNumber: options.dayNumber,
    label: options.label,
    summary,
    highTemperature,
    lowTemperature,
    condition: representative,
  };
  forecastCache.set(key, day);
  return day;
}

export function resolveWeatherCondition(
  options: WeatherDaySeed
): WorldEnvironmentWeatherConditionLike {
  const front = resolveWeatherFront(options);
  const humidity = resolveHumidity(options, front);
  const cloudCover = clamp(
    humidity * 0.58 + front.intensity * 0.3 + front.humidityShift * 0.18,
    0,
    1
  );
  const windStrength = clamp(
    0.18 +
      front.speed * 0.62 +
      hash2D(WEATHER_WIND_EXPOSURE_SEED, options.regionX, options.regionY) * 0.22,
    0,
    1
  );
  const freezeFactor = resolveFreezeFactor(options, front);
  const convectiveLift = clamp(
    front.intensity * 0.62 +
      humidity * 0.34 +
      hash2D(WEATHER_LIFT_SEED, options.regionX, options.dayNumber) * 0.16,
    0,
    1
  );
  const precipitation = clamp(
    cloudCover * (0.48 + humidity * 0.34) * (0.45 + convectiveLift * 0.55),
    0,
    1
  );
  const fogBias = resolveFogBias(options, humidity, windStrength, cloudCover);
  const temperature = resolveTemperatureF(options, front);
  const kind = resolveWeatherKind({
    precipitation,
    freezeFactor,
    fogBias,
    windStrength,
    cloudCover,
    front,
  });
  const visibility = resolveVisibility(kind, cloudCover, precipitation, fogBias);

  return {
    kind,
    label: WEATHER_KIND_LABELS[kind],
    intensity: clamp(
      Math.max(front.intensity, precipitation, fogBias, windStrength * 0.85),
      0,
      1
    ),
    cloudCover,
    windStrength,
    precipitation,
    visibility,
    temperature,
    front,
  };
}

export function resolveWeatherFront(
  options: WeatherDaySeed
): WorldEnvironmentWeatherFrontLike {
  let strongest: WorldEnvironmentWeatherFrontLike = {
    id: `front-${options.regionX}-${options.regionY}-${options.dayNumber}-calm`,
    kind: 'warm',
    intensity: 0.08,
    humidityShift: 0.1,
    temperatureShift: 0.08,
    windDirectionDegrees: 90,
    speed: 0.18,
  };

  for (let index = 0; index < 3; index += 1) {
    const seed = hash2D(
      WEATHER_FRONT_SEED,
      options.regionX * 7 + index * 13,
      options.regionY * 11 + index * 17
    );
    const laneScale = 7 + seed * 6;
    const laneAngle = seed * Math.PI * 0.9 + index * 0.42;
    const lanePosition =
      options.regionX * Math.cos(laneAngle) + options.regionY * Math.sin(laneAngle);
    const frontTravel =
      options.dayNumber * (0.22 + seed * 0.18) + options.dayProgress * (0.9 + seed * 0.5);
    const wave = fract(lanePosition / laneScale - frontTravel * 0.18 + seed);
    const distance = Math.abs(wave - 0.5) * 2;
    const intensity = 1 - smoothstep(0.06, 0.58, distance);
    if (intensity <= strongest.intensity) {
      continue;
    }

    const kindSignal = hash2D(
      WEATHER_FRONT_KIND_SEED,
      index + Math.floor(options.dayNumber / 2),
      options.regionX - options.regionY
    );
    const kind =
      kindSignal < 0.34 ? 'warm' : kindSignal < 0.68 ? 'cold' : 'occluded';
    const humidityShift =
      kind === 'warm' ? 0.26 + seed * 0.24 : kind === 'cold' ? 0.12 + seed * 0.14 : 0.34;
    const temperatureShift =
      kind === 'warm' ? 0.2 + seed * 0.12 : kind === 'cold' ? -0.26 - seed * 0.14 : -0.04;
    strongest = {
      id: `front-${options.regionX}-${options.regionY}-${options.dayNumber}-${index}`,
      kind,
      intensity,
      humidityShift,
      temperatureShift,
      windDirectionDegrees: Math.round(((laneAngle / (Math.PI * 2)) * 360 + 360) % 360),
      speed: clamp(0.28 + intensity * 0.46 + seed * 0.18, 0, 1),
    };
  }

  return strongest;
}

function resolveWeatherKind(options: {
  precipitation: number;
  freezeFactor: number;
  fogBias: number;
  windStrength: number;
  cloudCover: number;
  front: WorldEnvironmentWeatherFrontLike;
}): WorldEnvironmentWeatherConditionLike['kind'] {
  if (
    options.freezeFactor > 0.74 &&
    options.precipitation > 0.68 &&
    options.front.kind === 'cold' &&
    options.windStrength > 0.58
  ) {
    return 'hail';
  }
  if (options.freezeFactor > 0.58 && options.precipitation > 0.56) {
    return 'snow';
  }
  if (options.precipitation > 0.72) {
    return 'heavy-rain';
  }
  if (options.precipitation > 0.44) {
    return 'light-rain';
  }
  if (options.fogBias > 0.64) {
    return 'fog';
  }
  if (options.windStrength > 0.66 && options.cloudCover < 0.58) {
    return 'wind';
  }
  if (options.cloudCover > 0.36) {
    return 'clouds';
  }
  return 'clear';
}

function pickRepresentativeCondition(
  conditions: WorldEnvironmentWeatherConditionLike[]
): WorldEnvironmentWeatherConditionLike {
  let representative = conditions[0]!;
  let bestScore =
    representative.precipitation * 1.4 +
    representative.cloudCover * 0.5 +
    representative.windStrength * 0.4 +
    representative.intensity * 0.3;

  for (let index = 1; index < conditions.length; index += 1) {
    const condition = conditions[index]!;
    const score =
      condition.precipitation * 1.4 +
      condition.cloudCover * 0.5 +
      condition.windStrength * 0.4 +
      condition.intensity * 0.3;
    if (score <= bestScore) {
      continue;
    }
    representative = condition;
    bestScore = score;
  }

  return representative;
}

function resolveHumidity(
  options: WeatherDaySeed,
  front: WorldEnvironmentWeatherFrontLike
) {
  const basinSignal = hash2D(
    WEATHER_BASIN_SEED,
    Math.floor(options.regionX / 2),
    Math.floor(options.regionY / 2)
  );
  const latitudeMoisture = 1 - Math.abs(options.latitudeDegrees) / 90;
  const seasonalStormBias = Math.sin(options.yearProgress * Math.PI * 2) * 0.1;
  return clamp(
    0.24 +
      basinSignal * 0.38 +
      latitudeMoisture * 0.16 +
      front.humidityShift * front.intensity +
      seasonalStormBias,
    0,
    1
  );
}

function resolveFreezeFactor(
  options: WeatherDaySeed,
  front: WorldEnvironmentWeatherFrontLike
) {
  const equatorWarmth = 1 - Math.abs(options.latitudeDegrees) / 90;
  const hemisphereSeason =
    Math.cos((options.yearProgress - 0.25) * Math.PI * 2) *
    (options.latitudeDegrees >= 0 ? 1 : -1);
  const baseCold = (1 - equatorWarmth) * 0.62;
  const seasonCold = clamp(-hemisphereSeason, 0, 1) * (0.1 + Math.abs(options.latitudeDegrees) / 90 * 0.42);
  return clamp(baseCold + seasonCold + Math.max(0, -front.temperatureShift) * 0.9, 0, 1);
}

function resolveTemperatureF(
  options: WeatherDaySeed,
  front: WorldEnvironmentWeatherFrontLike
) {
  const equatorWarmth = 1 - Math.abs(options.latitudeDegrees) / 90;
  const hemisphereSeason =
    Math.cos((options.yearProgress - 0.25) * Math.PI * 2) *
    (options.latitudeDegrees >= 0 ? 1 : -1);
  const dailyWarmth = Math.sin((options.dayProgress - 0.25) * Math.PI * 2) * 0.5 + 0.5;
  const baseF = lerp(22, 82, equatorWarmth);
  const seasonF = hemisphereSeason * lerp(6, 20, 1 - equatorWarmth);
  const daylightF = lerp(-8, 7, dailyWarmth);
  const frontF = front.temperatureShift * 28;
  return clamp(baseF + seasonF + daylightF + frontF, -10, 110);
}

function resolveFogBias(
  options: WeatherDaySeed,
  humidity: number,
  windStrength: number,
  cloudCover: number
) {
  const dawnFactor =
    1 -
    Math.min(
      1,
      Math.abs(options.dayProgress - 0.22) / 0.14
    );
  return clamp(
    humidity * 0.62 +
      dawnFactor * 0.34 +
      (1 - windStrength) * 0.18 +
      cloudCover * 0.08,
    0,
    1
  );
}

function resolveVisibility(
  kind: WorldEnvironmentWeatherConditionLike['kind'],
  cloudCover: number,
  precipitation: number,
  fogBias: number
) {
  if (kind === 'fog') {
    return clamp(0.18 + (1 - fogBias) * 0.24, 0.12, 0.42);
  }
  if (kind === 'heavy-rain' || kind === 'snow' || kind === 'hail') {
    return clamp(0.32 + (1 - precipitation) * 0.22, 0.24, 0.54);
  }
  if (kind === 'light-rain' || kind === 'clouds') {
    return clamp(0.5 + (1 - cloudCover) * 0.2, 0.44, 0.72);
  }
  return clamp(0.72 + (1 - cloudCover) * 0.22, 0.62, 0.94);
}

function resolveWeatherSkyPalette(condition: WorldEnvironmentWeatherConditionLike) {
  const haze = condition.cloudCover * 0.48 + (1 - condition.visibility) * 0.42;
  const gray = Math.round(118 + haze * 56)
    .toString(16)
    .padStart(2, '0');
  return {
    dayColor:
      condition.kind === 'snow'
        ? '#d6e8f5'
        : condition.kind === 'hail'
          ? '#cfe0ee'
          : `#8f${gray}${gray}`,
    sunsetColor:
      condition.kind === 'fog'
        ? '#c9b2a1'
        : condition.kind === 'heavy-rain'
          ? '#b58f7d'
          : '#e59b72',
    fogDayColor:
      condition.kind === 'snow' || condition.kind === 'hail' ? '#d9e4ef' : '#a8bfce',
    fogNightColor:
      condition.kind === 'fog' ? '#0d1b28' : condition.kind === 'heavy-rain' ? '#0b1724' : '#0a1524',
  };
}

function resolveWeatherLighting(condition: WorldEnvironmentWeatherConditionLike) {
  const cloudDimming = condition.cloudCover * 0.4 + condition.precipitation * 0.22;
  return {
    ambientDayColor: condition.kind === 'snow' ? '#f4fbff' : '#dce8f2',
    groundDayColor:
      condition.kind === 'snow'
        ? '#dfe8ef'
        : condition.kind === 'heavy-rain'
          ? '#243c31'
          : '#2d4934',
    shadowStrength: clamp(0.95 - cloudDimming, 0.22, 0.95),
  };
}
