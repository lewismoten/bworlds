import { describe, expect, it } from 'vitest';
import {
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
  getCelestialEventsForDay,
  getDaylightCycleState,
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

  it('exposes periodic planets, meteor showers, and comets', () => {
    const events = getCelestialEventsForDay(0, {
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    });

    expect(events.some((event) => event.type === 'planet')).toBe(true);
    expect(events.some((event) => event.type === 'meteor-shower')).toBe(true);
    expect(events.some((event) => event.type === 'comet')).toBe(true);
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
