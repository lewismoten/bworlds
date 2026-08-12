import { describe, expect, it } from 'vitest';
import {
  createHydrologyFeatureZoomRange,
  createTransportFeatureZoomRange,
} from './map-feature-policies.ts';

describe('map feature policies', () => {
  it('keeps major rivers visible at lower zoom than smaller waterways', () => {
    expect(createHydrologyFeatureZoomRange('major-river')).toEqual({
      minZoom: 0,
    });
    expect(createHydrologyFeatureZoomRange('river')).toEqual({
      minZoom: 3,
    });
    expect(createHydrologyFeatureZoomRange('stream')).toEqual({
      minZoom: 6,
    });
    expect(createHydrologyFeatureZoomRange('local-stream')).toEqual({
      minZoom: 9,
    });
  });

  it('reveals local roads later than major transport corridors', () => {
    expect(createTransportFeatureZoomRange('rail-trunk')).toEqual({
      minZoom: 2,
    });
    expect(createTransportFeatureZoomRange('highway')).toEqual({
      minZoom: 3,
    });
    expect(createTransportFeatureZoomRange('arterial-road')).toEqual({
      minZoom: 5,
    });
    expect(createTransportFeatureZoomRange('local-road')).toEqual({
      minZoom: 8,
    });
    expect(createTransportFeatureZoomRange('track')).toEqual({
      minZoom: 10,
    });
  });
});
