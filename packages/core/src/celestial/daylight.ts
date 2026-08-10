import { getDaylightCycleState } from './getDaylightCycleState';
import { getWorldTimeMs } from './time';

export function getWorldDaylightCycle(
  realTimeMs: number,
  options: {
    timeOffsetMs?: number;
    cycle?: {
      dayLengthMs?: number;
      offsetMs?: number;
    };
  } = {}
) {
  const worldTimeMs = getWorldTimeMs(realTimeMs, {
    timeOffsetMs: options.timeOffsetMs,
  });
  return {
    worldTimeMs,
    cycle: getDaylightCycleState(worldTimeMs, options.cycle ?? {}),
  };
}

export function alignWorldTimeOffsetToDayProgress(
  realTimeMs: number,
  currentOffsetMs: number,
  targetDayProgress: number,
  options: {
    dayLengthMs?: number;
    offsetMs?: number;
  } = {}
) {
  const { cycle } = getWorldDaylightCycle(realTimeMs, {
    timeOffsetMs: currentOffsetMs,
    cycle: options,
  });
  let deltaMs = (targetDayProgress - cycle.dayProgress) * cycle.dayLengthMs;
  if (deltaMs < 0) {
    deltaMs += cycle.dayLengthMs;
  }
  return currentOffsetMs + deltaMs;
}
