import { describe, expect, it } from 'vitest';
import { resolveForecastDay, resolveWeatherProfile } from './index.ts';

describe('runtime weather long-running checks', () => {
  it(
    'keeps weather profiles stable after repeated regional churn',
    { timeout: 4000 },
    () => {
      const baseline = resolveWeatherProfile({
        playerX: 120,
        playerY: -360,
        timeMs: 3 * 24 * 60 * 60 * 1000,
      });

      for (let index = 0; index < 960; index += 1) {
        resolveWeatherProfile({
          playerX: (index % 48) * 24,
          playerY: (Math.floor(index / 48) - 10) * 24,
          timeMs: index * 60 * 60 * 1000,
        });
      }

      expect(
        resolveWeatherProfile({
          playerX: 120,
          playerY: -360,
          timeMs: 3 * 24 * 60 * 60 * 1000,
        })
      ).toEqual(baseline);
    }
  );

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
});
