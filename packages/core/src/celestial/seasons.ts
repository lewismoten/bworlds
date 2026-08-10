import {
  DEFAULT_CONSTELLATION_COUNT,
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_YEAR_LENGTH_DAYS,
} from './time';

export function advanceWorldTimeOffsetBySeasons(
  currentOffsetMs: number,
  seasons: number,
  options: {
    dayLengthMs?: number;
    yearLengthDays?: number;
    constellationCount?: number;
  } = {}
) {
  const dayLengthMs = options.dayLengthMs ?? DEFAULT_DAY_LENGTH_MS;
  const yearLengthDays = options.yearLengthDays ?? DEFAULT_YEAR_LENGTH_DAYS;
  const constellationCount = Math.max(
    1,
    Math.floor(options.constellationCount ?? DEFAULT_CONSTELLATION_COUNT)
  );
  const seasonLengthDays = yearLengthDays / constellationCount;
  return currentOffsetMs + seasons * seasonLengthDays * dayLengthMs;
}
