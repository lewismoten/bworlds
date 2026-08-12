import type { MapFeatureZoomRange } from './map-features.ts';

export type HydrologyFeatureScale =
  | 'major-river'
  | 'river'
  | 'stream'
  | 'local-stream';

export type TransportFeatureScale =
  | 'rail-trunk'
  | 'highway'
  | 'arterial-road'
  | 'local-road'
  | 'track';

export function createHydrologyFeatureZoomRange(
  scale: HydrologyFeatureScale
): MapFeatureZoomRange {
  switch (scale) {
    case 'major-river':
      return { minZoom: 0 };
    case 'river':
      return { minZoom: 3 };
    case 'stream':
      return { minZoom: 6 };
    case 'local-stream':
      return { minZoom: 9 };
    default:
      return assertNever(scale);
  }
}

export function createTransportFeatureZoomRange(
  scale: TransportFeatureScale
): MapFeatureZoomRange {
  switch (scale) {
    case 'rail-trunk':
      return { minZoom: 2 };
    case 'highway':
      return { minZoom: 3 };
    case 'arterial-road':
      return { minZoom: 5 };
    case 'local-road':
      return { minZoom: 8 };
    case 'track':
      return { minZoom: 10 };
    default:
      return assertNever(scale);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported feature scale ${JSON.stringify(value)}.`);
}
