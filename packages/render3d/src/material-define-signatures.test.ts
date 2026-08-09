import { describe, expect, it } from 'vitest';

import {
  countUniqueMaterialDefineSignatures,
  getMaterialDefineSignature,
} from './material-define-signatures.ts';

describe('material define signatures', () => {
  it('normalizes shader define combinations deterministically', () => {
    expect(
      getMaterialDefineSignature({
        type: 'ShaderMaterial',
        defines: {
          USE_GLOW: true,
          PASS_COUNT: 2,
        },
      } as never)
    ).toBe('ShaderMaterial|PASS_COUNT:2,USE_GLOW:true');
  });

  it('counts only unique non-empty define signatures', () => {
    expect(
      countUniqueMaterialDefineSignatures([
        {
          type: 'ShaderMaterial',
          defines: {
            PASS_COUNT: 2,
          },
        } as never,
        {
          type: 'ShaderMaterial',
          defines: {
            PASS_COUNT: 2,
          },
        } as never,
        {
          type: 'RawShaderMaterial',
          defines: {
            USE_FOG: 1,
          },
        } as never,
        {
          type: 'MeshStandardMaterial',
        } as never,
      ])
    ).toBe(2);
  });
});
