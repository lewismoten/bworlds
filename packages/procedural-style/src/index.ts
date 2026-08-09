import {
  getOrCreateCacheValue,
  getOrCreateMapValue,
  type CacheLike,
} from '@bworlds/cache-support';
import type { ThreeHostLike } from '@bworlds/plugin-api';

export function createRegionKey(
  tileX: number,
  tileY: number,
  regionSize: number
): {
  regionX: number;
  regionY: number;
  key: string;
} {
  const regionX = Math.floor(tileX / regionSize);
  const regionY = Math.floor(tileY / regionSize);
  return {
    regionX,
    regionY,
    key: `${regionX}:${regionY}`,
  };
}

export function getOrCreateRegionalValue<T>(
  cache: CacheLike<string, T>,
  tileX: number,
  tileY: number,
  regionSize: number,
  createValue: (context: {
    regionX: number;
    regionY: number;
    key: string;
  }) => T
): T {
  const context = createRegionKey(tileX, tileY, regionSize);
  return cache instanceof Map
    ? getOrCreateMapValue(cache, context.key, () => createValue(context))
    : getOrCreateCacheValue(cache, context.key, () => createValue(context));
}

export function createRegionalValueResolver<T>(
  cache: CacheLike<string, T>,
  regionSize: number,
  createValue: (context: {
    regionX: number;
    regionY: number;
    key: string;
    tileX: number;
    tileY: number;
  }) => T
) {
  return function resolveRegionalValue(tileX: number, tileY: number): T {
    return getOrCreateRegionalValue(
      cache,
      tileX,
      tileY,
      regionSize,
      ({ regionX, regionY, key }) =>
        createValue({
          regionX,
          regionY,
          key,
          tileX,
          tileY,
        })
    );
  };
}

export function createCoordinateValueResolver<T>(
  cache: CacheLike<string, T>,
  createValue: (context: {
    key: string;
    tileX: number;
    tileY: number;
  }) => T
) {
  return function resolveCoordinateValue(tileX: number, tileY: number): T {
    const key = `${tileX}:${tileY}`;
    return cache instanceof Map
      ? getOrCreateMapValue(cache, key, () =>
          createValue({
            key,
            tileX,
            tileY,
          })
        )
      : getOrCreateCacheValue(cache, key, () =>
          createValue({
            key,
            tileX,
            tileY,
          })
        );
  };
}

export function createRegionalMaterialResolver<
  TMaterial,
  THost extends object = ThreeHostLike,
>(
  cache: Map<
    string,
    {
      createMaterials(three: THost): TMaterial;
    }
  > | CacheLike<
    string,
    {
      createMaterials(three: THost): TMaterial;
    }
  >,
  regionSize: number,
  createValue: (context: {
    regionX: number;
    regionY: number;
    key: string;
    tileX: number;
    tileY: number;
  }) => {
    createMaterials(three: THost): TMaterial;
  }
) {
  const resolveBlueprint = createRegionalValueResolver(
    cache,
    regionSize,
    createValue
  );

  return function resolveRegionalMaterial(
    three: THost,
    tileX: number,
    tileY: number
  ): TMaterial {
    return resolveBlueprint(tileX, tileY).createMaterials(three);
  };
}

export function pickThresholdColor(
  signal: number,
  threshold: number,
  whenAbove: string,
  whenBelow: string
): string {
  return signal > threshold ? whenAbove : whenBelow;
}

export function tintHexColor(hex: string, factor: number): string {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel * factor)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}
