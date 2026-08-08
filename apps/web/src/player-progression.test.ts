import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAYER_LEVEL,
  MAX_PLAYER_LEVEL,
  getPlayerLevelChange,
  normalizePlayerLevel,
} from './player-progression.ts';

describe('player progression helpers', () => {
  it('normalizes invalid or out-of-range levels into a safe saved range', () => {
    expect(normalizePlayerLevel(undefined)).toBe(DEFAULT_PLAYER_LEVEL);
    expect(normalizePlayerLevel(Number.NaN)).toBe(DEFAULT_PLAYER_LEVEL);
    expect(normalizePlayerLevel(0)).toBe(DEFAULT_PLAYER_LEVEL);
    expect(normalizePlayerLevel(4.6)).toBe(5);
    expect(normalizePlayerLevel(200)).toBe(MAX_PLAYER_LEVEL);
  });

  it('detects level changes in both directions after normalization', () => {
    expect(getPlayerLevelChange(1, 2)).toBe('level-up');
    expect(getPlayerLevelChange(5.4, 4.4)).toBe('level-down');
    expect(getPlayerLevelChange(undefined, 1)).toBeNull();
    expect(getPlayerLevelChange(3.2, 3.4)).toBeNull();
  });
});
