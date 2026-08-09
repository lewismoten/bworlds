import { describe, expect, it } from 'vitest';

import {
  getMaterialShaderComplexityClass,
  getMaxMaterialShaderComplexityClass,
  MATERIAL_SHADER_COMPLEXITY_CUSTOM,
  MATERIAL_SHADER_COMPLEXITY_LIT,
  MATERIAL_SHADER_COMPLEXITY_SIMPLE,
} from './material-shader-complexity.ts';

describe('material shader complexity', () => {
  it('classifies simple, lit, and custom materials consistently', () => {
    expect(
      getMaterialShaderComplexityClass({
        type: 'MeshBasicMaterial',
      } as never)
    ).toBe(MATERIAL_SHADER_COMPLEXITY_SIMPLE);

    expect(
      getMaterialShaderComplexityClass({
        type: 'MeshStandardMaterial',
      } as never)
    ).toBe(MATERIAL_SHADER_COMPLEXITY_LIT);

    expect(
      getMaterialShaderComplexityClass({
        type: 'ShaderMaterial',
        vertexShader: 'void main() {}',
        fragmentShader: 'void main() {}',
      } as never)
    ).toBe(MATERIAL_SHADER_COMPLEXITY_CUSTOM);
  });

  it('returns the maximum class across a material set', () => {
    expect(
      getMaxMaterialShaderComplexityClass([
        {
          type: 'MeshBasicMaterial',
        } as never,
        {
          type: 'MeshStandardMaterial',
        } as never,
        {
          type: 'ShaderMaterial',
          vertexShader: 'void main() {}',
          fragmentShader: 'void main() {}',
        } as never,
      ])
    ).toBe(MATERIAL_SHADER_COMPLEXITY_CUSTOM);
  });
});
