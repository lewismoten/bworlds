import type { TerrainSplatMaterialPlan } from './material-plan.ts';
import type { TerrainTextureBindingRuntimePlan } from './texture-binding-runtime-plan.ts';

export type TerrainSplatShaderVariantFeature =
  | 'baseColor'
  | 'normal'
  | 'roughness'
  | 'metalness'
  | 'ambientOcclusion';

export type TerrainSplatShaderSourcePlan = {
  variantKey: string;
  bindingMode: 'texture-array' | 'per-layer-textures';
  features: readonly TerrainSplatShaderVariantFeature[];
  defines: readonly string[];
  uniformNames: readonly string[];
  attributeNames: readonly string[];
  dynamicBranchCount: number;
  vertexShader: string;
  fragmentShader: string;
};

export function createTerrainSplatShaderSourcePlan(params: {
  materialPlan: TerrainSplatMaterialPlan;
  textureBindingPlan: TerrainTextureBindingRuntimePlan;
}): TerrainSplatShaderSourcePlan {
  const features = params.textureBindingPlan.bindings
    .map((binding) => binding.purpose)
    .filter(isShaderFeature)
    .sort();
  const defines = createShaderDefines(params.textureBindingPlan.mode, features);
  const variantKey = [
    `mode:${params.textureBindingPlan.mode}`,
    `features:${features.join(',')}`,
  ].join('|');

  return {
    variantKey,
    bindingMode: params.textureBindingPlan.mode,
    features,
    defines,
    uniformNames: params.materialPlan.globalUniforms,
    attributeNames: params.materialPlan.requiredAttributes.map(
      (attribute) => attribute.name
    ),
    dynamicBranchCount: 1,
    vertexShader: createTerrainSplatVertexShaderSource(),
    fragmentShader: createTerrainSplatFragmentShaderSource({
      bindingMode: params.textureBindingPlan.mode,
      features,
    }),
  };
}

function createShaderDefines(
  mode: 'texture-array' | 'per-layer-textures',
  features: readonly TerrainSplatShaderVariantFeature[]
): readonly string[] {
  const defines = [
    mode === 'texture-array'
      ? 'TERRAIN_SPLAT_TEXTURE_ARRAYS'
      : 'TERRAIN_SPLAT_PER_LAYER_TEXTURES',
  ];
  for (const feature of features) {
    defines.push(`TERRAIN_SPLAT_USE_${toDefineToken(feature)}`);
  }
  return defines;
}

function createTerrainSplatVertexShaderSource(): string {
  return [
    'attribute vec4 terrainSplatLayerIndices;',
    'attribute vec4 terrainSplatLayerWeights;',
    'varying vec2 vTerrainSplatUv;',
    'varying vec4 vTerrainSplatLayerIndices;',
    'varying vec4 vTerrainSplatLayerWeights;',
    'varying vec3 vTerrainSplatWorldPosition;',
    'void main() {',
    '  vTerrainSplatUv = uv;',
    '  vTerrainSplatLayerIndices = terrainSplatLayerIndices;',
    '  vTerrainSplatLayerWeights = terrainSplatLayerWeights;',
    '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
    '  vTerrainSplatWorldPosition = worldPosition.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * worldPosition;',
    '}',
  ].join('\n');
}

function createTerrainSplatFragmentShaderSource(params: {
  bindingMode: 'texture-array' | 'per-layer-textures';
  features: readonly TerrainSplatShaderVariantFeature[];
}): string {
  const featureSet = new Set(params.features);
  const uniforms = createFragmentUniformLines(params.bindingMode, featureSet);
  const samplers = createFragmentSamplerHelpers(params.bindingMode, featureSet);
  const optionalInitializers = createOptionalBlendInitializers(featureSet);
  const optionalAccumulators = createOptionalBlendAccumulators(featureSet);
  const optionalOutputs = createOptionalOutputs(featureSet);

  return [
    'varying vec2 vTerrainSplatUv;',
    'varying vec4 vTerrainSplatLayerIndices;',
    'varying vec4 vTerrainSplatLayerWeights;',
    'varying vec3 vTerrainSplatWorldPosition;',
    'uniform bool terrainSplatBlendEnabled;',
    'uniform float terrainSplatWetness;',
    'uniform float terrainSplatSnow;',
    'uniform vec3 terrainSplatTint;',
    ...uniforms,
    ...samplers,
    'void main() {',
    '  vec3 blendedBaseColor = vec3(0.0);',
    featureSet.has('normal')
      ? '  vec3 blendedNormal = vec3(0.0, 0.0, 1.0);'
      : '  vec3 blendedNormal = vec3(0.0, 0.0, 1.0);',
    featureSet.has('roughness')
      ? '  float blendedRoughness = 0.0;'
      : '  float blendedRoughness = 1.0;',
    ...optionalInitializers,
    '  float blendEnabledFactor = terrainSplatBlendEnabled ? 1.0 : 0.0;',
    '  vec4 effectiveWeights = mix(',
    '    vec4(1.0, 0.0, 0.0, 0.0),',
    '    vTerrainSplatLayerWeights / 255.0,',
    '    blendEnabledFactor',
    '  );',
    '  for (int i = 0; i < 4; ++i) {',
    '    float weight = effectiveWeights[i];',
    '    int layerIndex = int(vTerrainSplatLayerIndices[i]);',
    featureSet.has('baseColor')
      ? '    blendedBaseColor += sampleTerrainSplatBaseColor(layerIndex, vTerrainSplatUv).rgb * weight;'
      : '    blendedBaseColor += vec3(1.0) * weight;',
    featureSet.has('normal')
      ? '    blendedNormal += (sampleTerrainSplatNormal(layerIndex, vTerrainSplatUv).xyz * 2.0 - 1.0) * weight;'
      : '    blendedNormal += vec3(0.0, 0.0, 1.0) * weight;',
    featureSet.has('roughness')
      ? '    blendedRoughness += sampleTerrainSplatRoughness(layerIndex, vTerrainSplatUv).r * weight;'
      : '',
    ...optionalAccumulators,
    '  }',
    '  blendedBaseColor *= terrainSplatTint;',
    '  blendedBaseColor *= mix(1.0, 0.92, clamp(terrainSplatWetness, 0.0, 1.0));',
    '  blendedBaseColor = mix(blendedBaseColor, vec3(1.0), clamp(terrainSplatSnow, 0.0, 1.0) * 0.35);',
    '  blendedNormal = normalize(blendedNormal);',
    '  gl_FragColor = vec4(blendedBaseColor, 1.0);',
    ...optionalOutputs,
    '}',
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}

function createFragmentUniformLines(
  mode: 'texture-array' | 'per-layer-textures',
  featureSet: ReadonlySet<TerrainSplatShaderVariantFeature>
): string[] {
  return [...featureSet].map((feature) => {
    const uniformName = getFeatureUniformName(feature);
    return mode === 'texture-array'
      ? `uniform highp sampler2DArray ${uniformName};`
      : `uniform sampler2D ${uniformName}[4];`;
  });
}

function createFragmentSamplerHelpers(
  mode: 'texture-array' | 'per-layer-textures',
  featureSet: ReadonlySet<TerrainSplatShaderVariantFeature>
): string[] {
  const helpers: string[] = [];
  for (const feature of featureSet) {
    const functionName = `sampleTerrainSplat${toPascalCase(feature)}`;
    const uniformName = getFeatureUniformName(feature);
    helpers.push(
      `vec4 ${functionName}(int layerIndex, vec2 uv) {`,
      mode === 'texture-array'
        ? `  return texture(${uniformName}, vec3(uv, float(layerIndex)));`
        : `  return texture(${uniformName}[clamp(layerIndex, 0, 3)], uv);`,
      '}'
    );
  }
  return helpers;
}

function createOptionalBlendInitializers(
  featureSet: ReadonlySet<TerrainSplatShaderVariantFeature>
): string[] {
  const lines: string[] = [];
  if (featureSet.has('metalness')) {
    lines.push('  float blendedMetalness = 0.0;');
  }
  if (featureSet.has('ambientOcclusion')) {
    lines.push('  float blendedAmbientOcclusion = 0.0;');
  }
  return lines;
}

function createOptionalBlendAccumulators(
  featureSet: ReadonlySet<TerrainSplatShaderVariantFeature>
): string[] {
  const lines: string[] = [];
  if (featureSet.has('metalness')) {
    lines.push(
      '    blendedMetalness += sampleTerrainSplatMetalness(layerIndex, vTerrainSplatUv).r * weight;'
    );
  }
  if (featureSet.has('ambientOcclusion')) {
    lines.push(
      '    blendedAmbientOcclusion += sampleTerrainSplatAmbientOcclusion(layerIndex, vTerrainSplatUv).r * weight;'
    );
  }
  return lines;
}

function createOptionalOutputs(
  featureSet: ReadonlySet<TerrainSplatShaderVariantFeature>
): string[] {
  const lines: string[] = [];
  if (featureSet.has('roughness')) {
    lines.push('  float terrainSplatResolvedRoughness = blendedRoughness;');
  }
  if (featureSet.has('metalness')) {
    lines.push('  float terrainSplatResolvedMetalness = blendedMetalness;');
  }
  if (featureSet.has('ambientOcclusion')) {
    lines.push(
      '  float terrainSplatResolvedAmbientOcclusion = blendedAmbientOcclusion;'
    );
  }
  lines.push('  vec3 terrainSplatResolvedNormal = blendedNormal;');
  return lines;
}

function isShaderFeature(value: string): value is TerrainSplatShaderVariantFeature {
  return (
    value === 'baseColor' ||
    value === 'normal' ||
    value === 'roughness' ||
    value === 'metalness' ||
    value === 'ambientOcclusion'
  );
}

function getFeatureUniformName(feature: TerrainSplatShaderVariantFeature): string {
  switch (feature) {
    case 'baseColor':
      return 'terrainSplatBaseColorMap';
    case 'normal':
      return 'terrainSplatNormalMap';
    case 'roughness':
      return 'terrainSplatRoughnessMap';
    case 'metalness':
      return 'terrainSplatMetalnessMap';
    case 'ambientOcclusion':
      return 'terrainSplatAmbientOcclusionMap';
  }
}

function toDefineToken(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase();
}

function toPascalCase(value: string): string {
  return value
    .replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, __, char: string) =>
      char.toUpperCase()
    )
    .replace(/[^a-zA-Z0-9]/g, '');
}
