import { describe, expect, it } from 'vitest';

import { blendLeadMotifWithRecognition } from './procedural-music-lead-motif.ts';

describe('procedural music lead motif', () => {
  it('preserves the opening theme motif so the phrase stays recognizable', () => {
    expect(
      blendLeadMotifWithRecognition({
        baseDegreeOffsets: [0, 2, 4, 2],
        recognitionDegreeOffsets: [3, 1, 0, 1],
      })
    ).toEqual([0, 2, 4, 2]);
  });

  it('weaves recognition degrees into longer motifs after the clear opening statement', () => {
    expect(
      blendLeadMotifWithRecognition({
        baseDegreeOffsets: [0, 2, 4, 2, 1, 0],
        recognitionDegreeOffsets: [3, 1, 0, 1, 2, 3],
      })
    ).toEqual([0, 2, 4, 2, 2, 0]);
  });
});
