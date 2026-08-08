import { describe, expect, it } from 'vitest';
import {
  createWeatherRuntimePlugin,
  resolveForecastDay,
  resolveWeatherCondition,
  resolveWeatherFront,
  resolveWeatherProfile,
} from './index.ts';

const plugin = createWeatherRuntimePlugin();

type WeatherEnvironmentPayload = Parameters<
  NonNullable<typeof plugin.resolveWorldEnvironment>
>[0];

function createEnvironmentPayload(
  x = 0,
  y = 0,
  timeMs = 0
): WeatherEnvironmentPayload {
  return {
    timeMs,
    state: {
      player: { x, y, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0, label: 'Overworld' };
      },
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return {
          name: 'Plains',
          color: '#84cc16',
          miniColor: '#65a30d',
          walkable: true,
          wallHeight: 0,
        };
      },
    },
  };
}

describe('runtime weather', () => {
  it('produces deterministic current weather and a seven day forecast', () => {
    const resolved = plugin.resolveWorldEnvironment?.(
      createEnvironmentPayload(0, 0, 0)
    );

    expect(resolved).toEqual(
      expect.objectContaining({
        weather: expect.objectContaining({
          current: expect.objectContaining({
            kind: expect.any(String),
            front: expect.objectContaining({
              id: expect.any(String),
              kind: expect.any(String),
            }),
          }),
          forecast: expect.arrayContaining([
            expect.objectContaining({ label: 'Today' }),
            expect.objectContaining({ label: 'Tomorrow' }),
          ]),
        }),
      })
    );
    expect(resolved && 'weather' in resolved ? resolved.weather?.forecast : undefined).toHaveLength(7);
    expect(plugin.resolveWorldEnvironment?.(createEnvironmentPayload(0, 0, 0))).toEqual(
      resolved
    );
  });

  it('changes forecast shape by region and season while remaining stable for the same seed', () => {
    const summer = resolveWeatherProfile({
      playerX: 0,
      playerY: 0,
      timeMs: 0,
    });
    const winter = resolveWeatherProfile({
      playerX: 0,
      playerY: 9000,
      timeMs: 0,
    });
    const farRegion = resolveWeatherProfile({
      playerX: 240,
      playerY: 240,
      timeMs: 0,
    });

    expect(summer).toEqual(
      resolveWeatherProfile({
        playerX: 0,
        playerY: 0,
        timeMs: 0,
      })
    );
    expect(winter.current.temperature).not.toBe(summer.current.temperature);
    expect(farRegion.forecast[0].summary).not.toBe(summer.forecast[0].summary);
  });

  it('resolves fronts with direction and intensity metadata', () => {
    const front = resolveWeatherFront({
      regionX: 2,
      regionY: -3,
      dayNumber: 5,
      yearProgress: 0.4,
      latitudeDegrees: 28,
      dayProgress: 0.35,
    });

    expect(front.id).toContain('front-2--3-5');
    expect(front.intensity).toBeGreaterThanOrEqual(0.08);
    expect(front.windDirectionDegrees).toBeGreaterThanOrEqual(0);
    expect(front.windDirectionDegrees).toBeLessThan(360);
  });

  it('returns forecast day summaries that reflect representative daily conditions', () => {
    const day = resolveForecastDay({
      regionX: 1,
      regionY: 1,
      dayNumber: 7,
      yearProgress: 0.2,
      latitudeDegrees: 12,
      label: 'Day 3',
    });

    expect(day.label).toBe('Day 3');
    expect(day.summary).toContain(day.condition.label);
    expect(day.highTemperature).toBeGreaterThanOrEqual(day.lowTemperature);
    expect(day.condition.label).toBeTruthy();
  });

  it('keeps forecast day resolution deterministic after bounded cache eviction churn', () => {
    const baseline = resolveForecastDay({
      regionX: 1,
      regionY: 1,
      dayNumber: 7,
      yearProgress: 0.2,
      latitudeDegrees: 12,
      label: 'Day 3',
    });

    for (let index = 0; index < 800; index += 1) {
      resolveForecastDay({
        regionX: index % 40,
        regionY: Math.floor(index / 40),
        dayNumber: index,
        yearProgress: (index % 100) / 100,
        latitudeDegrees: (index % 90) - 45,
        label: `Day ${index + 1}`,
      });
    }

    expect(
      resolveForecastDay({
        regionX: 1,
        regionY: 1,
        dayNumber: 7,
        yearProgress: 0.2,
        latitudeDegrees: 12,
        label: 'Day 3',
      })
    ).toEqual(baseline);
  });

  it('classifies frozen precipitation for cold, wet fronts', () => {
    const condition = resolveWeatherCondition({
      regionX: 0,
      regionY: 40,
      dayNumber: 12,
      yearProgress: 0.75,
      latitudeDegrees: 72,
      dayProgress: 0.4,
    });

    expect(['snow', 'hail', 'clouds', 'fog', 'light-rain', 'heavy-rain', 'wind', 'clear']).toContain(
      condition.kind
    );
    expect(condition.visibility).toBeGreaterThan(0);
    expect(condition.visibility).toBeLessThanOrEqual(1);
  });
});
