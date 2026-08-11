import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, getDaylightCycleState } from './index.ts';

describe('core utilities long-running checks', () => {
  it(
    'produces occasional daytime solar eclipses that briefly dim the world',
    { timeout: 4000 },
    () => {
      let eclipseCycle: ReturnType<typeof getDaylightCycleState> | null = null;

      for (let day = 0; day < 512 && !eclipseCycle; day += 1) {
        for (let step = 0; step < 96; step += 1) {
          const cycle = getDaylightCycleState(
            day * DEFAULT_DAY_LENGTH_MS + (step / 96) * DEFAULT_DAY_LENGTH_MS
          );
          if (cycle.solarEclipse.active && cycle.sunAltitude > 0.1) {
            eclipseCycle = cycle;
            break;
          }
        }
      }

      expect(eclipseCycle).toBeTruthy();
      expect(eclipseCycle?.solarEclipse.coverage).toBeGreaterThan(0.03);
      expect(eclipseCycle?.daylight).toBeLessThan(0.9);
      expect(eclipseCycle?.solarEclipse.moonAzimuth).toBeCloseTo(
        eclipseCycle?.sunAzimuth ?? 0,
        1
      );
    }
  );
});
