import { describe, expect, it } from 'vitest';
import {
  resolveProceduralMeterAccent,
  resolveProceduralMeterPosition,
} from './procedural-music-meter.ts';

describe('procedural music meter', () => {
  it('marks beats 1 and 3 as the strong beats in a 4/4 bar', () => {
    expect(resolveProceduralMeterPosition(0)).toEqual({
      beatIndex: 0,
      beatNumber: 1,
      isStrongBeat: true,
    });
    expect(resolveProceduralMeterPosition(1)).toEqual({
      beatIndex: 1,
      beatNumber: 2,
      isStrongBeat: false,
    });
    expect(resolveProceduralMeterPosition(2)).toEqual({
      beatIndex: 2,
      beatNumber: 3,
      isStrongBeat: true,
    });
    expect(resolveProceduralMeterPosition(3)).toEqual({
      beatIndex: 3,
      beatNumber: 4,
      isStrongBeat: false,
    });
  });

  it('applies stronger accents to notes that land on beats 1 and 3', () => {
    const strongLead = resolveProceduralMeterAccent('lead', 2);
    const weakLead = resolveProceduralMeterAccent('lead', 1);

    expect(strongLead.volumeMultiplier).toBeGreaterThan(
      weakLead.volumeMultiplier
    );
    expect(strongLead.durationMultiplier).toBeGreaterThan(
      weakLead.durationMultiplier
    );
  });
});
