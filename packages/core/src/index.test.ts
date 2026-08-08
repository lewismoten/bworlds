import { describe, expect, it } from 'vitest';
import {
  applyCelestialEnvironmentOverrides,
  advanceWorldTimeOffsetByHours,
  advanceWorldTimeOffsetBySeasons,
  alignWorldTimeOffsetToDayProgress,
  cardinalFromAngle,
  createPlayer,
  createWorldState,
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_YEAR_LENGTH_DAYS,
  formatCelestialDate,
  generateConstellations,
  generatePoiName,
  getCelestialEventsForDay,
  getCometOrbitProgress,
  getDaylightCycleState,
  getMilkyWayBandSamples,
  getOrbitalSkyPosition,
  getOrreryBodies,
  getPlanetaryOrbitProgress,
  getWorldDaylightCycle,
  getWorldTimeMs,
  hash2D,
  toGps,
  WORLD_TILES_WIDE,
} from './index.ts';

describe('core utilities', () => {
  it('returns deterministic hashes', () => {
    expect(hash2D('seed', 4, 9)).toBe(hash2D('seed', 4, 9));
    expect(hash2D('seed', 4, 9)).not.toBe(hash2D('seed', 4, 10));
  });

  it('maps world coordinates to GPS coordinates', () => {
    expect(toGps(0, 0)).toEqual({ latitude: 0, longitude: 0 });
    expect(toGps(WORLD_TILES_WIDE / 4, 0).longitude).toBeCloseTo(90);
  });

  it('maps angles to cardinals', () => {
    expect(cardinalFromAngle(0)).toBe('E');
    expect(cardinalFromAngle(Math.PI / 2)).toBe('S');
    expect(cardinalFromAngle(Math.PI)).toBe('W');
  });

  it('computes a shared day-night cycle and moon phase state', () => {
    const midnight = getDaylightCycleState(0, {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    });
    const noon = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS / 2, {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    });
    const nextDay = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS, {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    });

    expect(midnight.dayProgress).toBe(0);
    expect(midnight.isNight).toBe(true);
    expect(midnight.moonPhaseName).toBe('New Moon');
    expect(midnight.sunriseAzimuth).toBeCloseTo(0, 5);
    expect(noon.dayProgress).toBe(0.5);
    expect(noon.daylight).toBeGreaterThan(0.95);
    expect(noon.isNight).toBe(false);
    expect(noon.moonMidnightOrbitProgress).toBe(midnight.moonMidnightOrbitProgress);
    expect(nextDay.dayNumber).toBe(1);
    expect(nextDay.moonPhaseName).toBe('Waxing Crescent');
  });

  it('generates deterministic procedural constellations with names and links', () => {
    const left = generateConstellations('spec-seed');
    const right = generateConstellations('spec-seed');

    expect(left).toEqual(right);
    expect(left[0].name).toMatch(/\w+ \w+/);
    expect(left[0].stars.length).toBeGreaterThanOrEqual(5);
    expect(left[0].connections.length).toBeGreaterThanOrEqual(4);
  });

  it('limits repeated constellation prefixes and suffixes while allowing figure-style names', () => {
    const constellations = generateConstellations('repeat-spec', { count: 12 });
    const prefixCounts = new Map<string, number>();
    const suffixCounts = new Map<string, number>();
    let figureNames = 0;

    constellations.forEach(({ name }) => {
      if (name.startsWith('The ') || name.includes("'s ")) {
        figureNames += 1;
        return;
      }

      const [prefix, suffix] = name.split(' ');
      prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
      suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
    });

    expect(Math.max(...prefixCounts.values())).toBeLessThanOrEqual(2);
    expect(Math.max(...suffixCounts.values())).toBeLessThanOrEqual(2);
    expect(figureNames).toBeGreaterThan(0);
  });

  it('generates visibly distinct constellation layouts across a seasonal set', () => {
    const constellations = generateConstellations('layout-spec', { count: 8 });
    const fingerprints = new Set(
      constellations.map((constellation) =>
        constellation.stars
          .slice(0, 5)
          .map((star) => `${star.x.toFixed(2)}:${star.y.toFixed(2)}`)
          .join('|')
      )
    );

    expect(fingerprints.size).toBeGreaterThanOrEqual(6);
  });

  it('shifts sunrise and daylight length across the seasonal year', () => {
    const winter = getDaylightCycleState(
      DEFAULT_DAY_LENGTH_MS * Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.75),
      {
        dayLengthMs: DEFAULT_DAY_LENGTH_MS,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      }
    );
    const summer = getDaylightCycleState(
      DEFAULT_DAY_LENGTH_MS * Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.25),
      {
        dayLengthMs: DEFAULT_DAY_LENGTH_MS,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      }
    );

    expect(summer.sunriseAzimuth).toBeGreaterThan(winter.sunriseAzimuth);
    expect(summer.daylightDuration).toBeGreaterThan(winter.daylightDuration);
    expect(summer.sunriseProgress).toBeLessThan(winter.sunriseProgress);
    expect(summer.sunsetProgress).toBeGreaterThan(winter.sunsetProgress);
    expect(summer.activeConstellation.name).not.toBe(winter.activeConstellation.name);
  });

  it('adjusts meridian height based on observer latitude', () => {
    const equatorNoon = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS * 0.5, {
      observerLatitudeDegrees: 0,
    });
    const northernNoon = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS * 0.5, {
      observerLatitudeDegrees: 60,
    });

    expect(equatorNoon.sunAltitude).toBeGreaterThan(northernNoon.sunAltitude);
  });

  it('maps orbital progress into observer-aware sky positions', () => {
    const equatorial = getOrbitalSkyPosition({
      orbitProgress: 0.5,
      observerLatitudeDegrees: 0,
      declination: 0.28,
      sunriseAzimuth: 0.08,
      sunsetAzimuth: Math.PI - 0.08,
      azimuthShift: 0.24,
    });
    const northern = getOrbitalSkyPosition({
      orbitProgress: 0.5,
      observerLatitudeDegrees: 55,
      declination: 0.28,
      sunriseAzimuth: 0.08,
      sunsetAzimuth: Math.PI - 0.08,
      azimuthShift: 0.24,
    });

    expect(equatorial.altitude).toBeGreaterThan(northern.altitude);
    expect(equatorial.azimuth).toBeCloseTo(northern.azimuth, 6);
  });

  it('provides shared world-clock helpers for offset and preset time changes', () => {
    expect(getWorldTimeMs(1000, { timeOffsetMs: 250 })).toBe(1250);

    const { worldTimeMs, cycle } = getWorldDaylightCycle(1000, {
      timeOffsetMs: 59000,
      cycle: { dayLengthMs: 60000 },
    });
    expect(worldTimeMs).toBe(60000);
    expect(cycle.dayNumber).toBe(1);

    expect(
      advanceWorldTimeOffsetByHours(0, 6, { dayLengthMs: DEFAULT_DAY_LENGTH_MS })
    ).toBe(DEFAULT_DAY_LENGTH_MS / 4);

    const presetOffset = alignWorldTimeOffsetToDayProgress(
      0,
      0,
      0.5,
      { dayLengthMs: DEFAULT_DAY_LENGTH_MS }
    );
    expect(presetOffset).toBe(DEFAULT_DAY_LENGTH_MS / 2);
    expect(
      advanceWorldTimeOffsetBySeasons(0, 1, {
        dayLengthMs: DEFAULT_DAY_LENGTH_MS,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
        constellationCount: 8,
      })
    ).toBe(DEFAULT_DAY_LENGTH_MS * 8);
  });

  it('builds a celestial date label from the constellation month and moon week', () => {
    expect(formatCelestialDate('Dawn Crown', 'Full Moon')).toEqual({
      month: 'Dawn Crown',
      week: 'Full Moon',
      label: 'Dawn Crown / Full Moon',
    });
  });

  it('generates deterministic quarry point-of-interest names', () => {
    const left = generatePoiName('quarry-spec', 'quarry', 18, -12);
    const right = generatePoiName('quarry-spec', 'quarry', 18, -12);

    expect(left).toBe(right);
    expect(left).toMatch(
      /\b(Quarry|Cut|Excavation|Pit|Works|Stone)\b/
    );
  });

  it('exposes periodic planets, meteor showers, and comets', () => {
    const events = getCelestialEventsForDay(0, {
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      dayProgress: 0.25,
      observerLatitudeDegrees: 24,
      solarDeclination: 0.12,
      sunriseAzimuth: 0.08,
      sunsetAzimuth: Math.PI - 0.08,
    });

    expect(events.some((event) => event.type === 'planet')).toBe(true);
    expect(events.some((event) => event.type === 'meteor-shower')).toBe(true);
    expect(events.some((event) => event.type === 'comet')).toBe(true);
    expect(events[0]).toEqual(
      expect.objectContaining({
        visibility: expect.any(Number),
        azimuth: expect.any(Number),
        altitude: expect.any(Number),
        color: expect.any(String),
        size: expect.any(Number),
        trailLength: expect.any(Number),
      })
    );
    expect(events.every((event) => event.visibility >= 0 && event.visibility <= 1)).toBe(
      true
    );
  });

  it('varies planetary orbital progress rather than moving at a perfectly uniform rate', () => {
    const firstStep = getPlanetaryOrbitProgress(1, {
      orbitLengthDays: 17,
      wobblePeriodDays: 9,
      wobbleAmplitude: 0.017,
      wobblePhase: 0.54,
    });
    const secondStep = getPlanetaryOrbitProgress(2, {
      orbitLengthDays: 17,
      wobblePeriodDays: 9,
      wobbleAmplitude: 0.017,
      wobblePhase: 0.54,
    });
    const thirdStep = getPlanetaryOrbitProgress(3, {
      orbitLengthDays: 17,
      wobblePeriodDays: 9,
      wobbleAmplitude: 0.017,
      wobblePhase: 0.54,
    });

    const deltaA = secondStep - firstStep;
    const deltaB = thirdStep - secondStep;

    expect(Math.abs(deltaA - deltaB)).toBeGreaterThan(0.0001);
  });

  it('accelerates comet progress near the start of its visible pass', () => {
    const firstStep = getCometOrbitProgress(0.5, 20, 0.18, 0.58);
    const secondStep = getCometOrbitProgress(1.5, 20, 0.18, 0.58);
    const thirdStep = getCometOrbitProgress(2.5, 20, 0.18, 0.58);

    expect(secondStep - firstStep).toBeGreaterThan(thirdStep - secondStep);
  });

  it('dims celestial events differently across daylight and night conditions', () => {
    const daytime = getCelestialEventsForDay(0, {
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      dayProgress: 0.5,
      observerLatitudeDegrees: 24,
      solarDeclination: 0.12,
      sunriseAzimuth: 0.08,
      sunsetAzimuth: Math.PI - 0.08,
      daylight: 1,
      night: 0,
      starsOpacity: 0,
    });
    const nighttime = getCelestialEventsForDay(0, {
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      dayProgress: 0.5,
      observerLatitudeDegrees: 24,
      solarDeclination: 0.12,
      sunriseAzimuth: 0.08,
      sunsetAzimuth: Math.PI - 0.08,
      daylight: 0,
      night: 1,
      starsOpacity: 1,
    });

    const dayMeteor = daytime.find((event) => event.type === 'meteor-shower');
    const nightMeteor = nighttime.find((event) => event.type === 'meteor-shower');
    const dayPlanet = daytime.find((event) => event.type === 'planet');
    const nightPlanet = nighttime.find((event) => event.type === 'planet');

    expect(dayMeteor?.visibility ?? 0).toBeLessThan(nightMeteor?.visibility ?? 1);
    expect(dayPlanet?.visibility ?? 0).toBeLessThanOrEqual(nightPlanet?.visibility ?? 1);
  });

  it('exposes a faint Milky Way belt state that responds to season and latitude', () => {
    const equatorial = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS * 5, {
      observerLatitudeDegrees: 0,
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    });
    const northern = getDaylightCycleState(
      DEFAULT_DAY_LENGTH_MS * Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.25),
      {
        observerLatitudeDegrees: 55,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      }
    );

    expect(equatorial.milkyWay.opacity).toBeGreaterThanOrEqual(0);
    expect(equatorial.milkyWay.opacity).toBeLessThanOrEqual(1);
    expect(northern.milkyWay.azimuthOffset).not.toBe(
      equatorial.milkyWay.azimuthOffset
    );
    expect(northern.milkyWay.inclination).not.toBe(
      equatorial.milkyWay.inclination
    );
  });

  it('rotates the Milky Way belt across the day as the sky turns overhead', () => {
    const sunrise = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS * 5, {
      observerLatitudeDegrees: 22,
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    });
    const sunset = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS * 5 + DEFAULT_DAY_LENGTH_MS * 0.5, {
      observerLatitudeDegrees: 22,
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    });

    expect(sunrise.milkyWay.azimuthOffset).not.toBeCloseTo(
      sunset.milkyWay.azimuthOffset,
      6
    );
    expect(sunrise.milkyWay.inclination).toBeCloseTo(
      sunset.milkyWay.inclination,
      6
    );
  });

  it('builds shared Milky Way band samples for ribbon rendering', () => {
    const cycle = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS * 5, {
      observerLatitudeDegrees: 22,
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    });
    const samples = getMilkyWayBandSamples(cycle.milkyWay, cycle.yearProgress, 24);

    expect(samples).toHaveLength(25);
    expect(samples[0]?.azimuth).toBeCloseTo(cycle.milkyWay.azimuthOffset, 6);
    expect(samples.every((sample) => sample.innerPhi < sample.centerPhi)).toBe(true);
    expect(samples.every((sample) => sample.outerPhi > sample.centerPhi)).toBe(true);
    expect(samples.every((sample) => sample.opacity >= 0 && sample.opacity <= 1)).toBe(
      true
    );
    expect(samples[0]?.centerPhi).toBeCloseTo(samples[samples.length - 1]?.centerPhi ?? 0, 6);
    expect(samples[0]?.innerPhi).toBeCloseTo(samples[samples.length - 1]?.innerPhi ?? 0, 6);
    expect(samples[0]?.outerPhi).toBeCloseTo(samples[samples.length - 1]?.outerPhi ?? 0, 6);
  });

  it('builds shared orrery bodies from the moon and visible orbital events', () => {
    const cycle = getDaylightCycleState(0, {
      observerLatitudeDegrees: 18,
    });
    const bodies = getOrreryBodies({
      moonAngle: cycle.moonAngle,
      moonIllumination: cycle.moonIllumination,
      visibleEvents: cycle.visibleEvents,
    });

    expect(bodies[0]).toEqual(
      expect.objectContaining({
        type: 'sun',
        orbitRadius: 0,
        orbitTilt: 0,
        orbitHeight: 0,
        orbitEccentricity: 0,
        orbitRotation: 0,
      })
    );
    expect(bodies.some((body) => body.type === 'moon')).toBe(true);
    expect(bodies.some((body) => body.type === 'planet')).toBe(true);
    expect(bodies.every((body) => body.angle >= 0 && body.angle < 1)).toBe(true);
    expect(
      bodies.every(
        (body) =>
          typeof body.orbitTilt === 'number' &&
          typeof body.orbitHeight === 'number' &&
          typeof body.orbitEccentricity === 'number' &&
          typeof body.orbitRotation === 'number'
      )
    ).toBe(true);
    expect(
      bodies.some((body) => body.type === 'planet' && body.orbitEccentricity > 0)
    ).toBe(true);
    expect(
      bodies.some((body) => body.type === 'comet' && body.orbitEccentricity >= 0.4)
    ).toBe(true);
  });

  it('can remove and append celestial events before regenerating orrery bodies', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const overrides = applyCelestialEnvironmentOverrides(cycle, {
      removeVisibleEventTypes: ['planet'],
      visibleEventsAppend: [
        {
          type: 'planet',
          name: 'Vela',
          progress: 0.42,
          intensity: 0.66,
          visibility: 0.8,
          azimuth: 1.2,
          altitude: 0.34,
          color: '#9fd0ff',
          size: 0.84,
          trailLength: 0,
        },
      ],
      deriveOrreryFromVisibleEvents: true,
    });

    expect(overrides.visibleEvents.some((event) => event.name === 'Vela')).toBe(true);
    expect(
      overrides.visibleEvents.some(
        (event) => event.type === 'planet' && event.name !== 'Vela'
      )
    ).toBe(false);
    expect(
      overrides.orreryBodies.some(
        (body) => body.type === 'planet' && body.id === 'planet:Vela'
      )
    ).toBe(true);
  });

  it('keeps named planet orbit lanes stable when visible events are filtered or replaced', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const overrides = applyCelestialEnvironmentOverrides(cycle, {
      removeVisibleEventTypes: ['planet'],
      visibleEventsAppend: [
        {
          type: 'planet',
          name: 'Vela',
          progress: 0.42,
          intensity: 0.66,
          visibility: 0.8,
          azimuth: 1.2,
          altitude: 0.34,
          color: '#9fd0ff',
          size: 0.84,
          trailLength: 0,
        },
      ],
      deriveOrreryFromVisibleEvents: true,
    });
    const overrideVela = overrides.orreryBodies.find(
      (body) => body.id === 'planet:Vela'
    );

    expect(overrideVela?.orbitRadius).toBeCloseTo(6.6, 6);
    expect(
      overrides.orreryBodies.filter((body) => body.type === 'planet')
    ).toHaveLength(1);
  });

  it('keeps comet orbit lanes stable regardless of which comet is currently visible', () => {
    const bodies = getOrreryBodies({
      moonAngle: 0,
      moonIllumination: 0.5,
      visibleEvents: [
        {
          type: 'comet',
          name: 'Kite',
          progress: 0.2,
          intensity: 0.8,
          visibility: 0.9,
          azimuth: 0.7,
          altitude: 0.24,
          color: '#dff6ff',
          size: 0.48,
          trailLength: 2.8,
        },
      ],
    });

    expect(bodies.find((body) => body.id === 'comet:Kite')?.orbitRadius).toBeCloseTo(
      8.1,
      6
    );
  });

  it('exposes tile-definition lookup through world state', () => {
    const state = createWorldState({
      generator: {
        getMap() {
          return {
            getTile() {
              return { kind: 'plains' };
            },
            getAction() {
              return null;
            },
            getExit() {
              return null;
            },
          };
        },
      },
      player: createPlayer(),
      resolveTileDefinition(kind) {
        return {
          name: kind === 'plains' ? 'Grassland' : 'Unknown',
          color: '#000000',
          miniColor: '#111111',
          walkable: kind === 'plains',
          wallHeight: 0,
        };
      },
    });

    expect(state.getTileDefinition('plains')).toEqual(
      expect.objectContaining({
        name: 'Grassland',
        walkable: true,
      })
    );
    expect(state.canWalk(0, 0)).toBe(true);
  });
});
