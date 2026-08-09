import { describe, expect, it } from 'vitest';
import { resolveMusicSpaceProfile } from './procedural-music-space.ts';

describe('procedural music space', () => {
  it('uses open air reverb by default for overworld travel', () => {
    expect(
      resolveMusicSpaceProfile({
        tileKind: 'forest',
        contextType: 'overworld',
      })
    ).toEqual(
      expect.objectContaining({
        id: 'outdoor-air',
        label: 'open air',
      })
    );
  });

  it('uses a hall-like shared reverb inside settlements and buildings', () => {
    const town = resolveMusicSpaceProfile({
      tileKind: 'town',
      contextType: 'town',
    });
    const building = resolveMusicSpaceProfile({
      tileKind: 'floor',
      contextType: 'building',
    });

    expect(town.id).toBe('settlement-hall');
    expect(building).toEqual(town);
  });

  it('uses a longer darker reverb in caves and dungeons', () => {
    const cavern = resolveMusicSpaceProfile({
      tileKind: 'cave',
      contextType: 'dungeon',
    });
    const outdoor = resolveMusicSpaceProfile({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    expect(cavern.id).toBe('cavern-echo');
    expect(cavern.delayMs).toBeGreaterThan(outdoor.delayMs);
    expect(cavern.toneHz).toBeLessThan(outdoor.toneHz);
    expect(cavern.wetGain).toBeGreaterThan(outdoor.wetGain);
  });
});
