import { describe, expect, it } from 'vitest';

import { getViewportRenderSize } from './viewport-resize.ts';

describe('viewport resize sizing', () => {
  it('prefers the stage bounds when sizing the renderers', () => {
    expect(
      getViewportRenderSize(
        {
          getBoundingClientRect() {
            return { width: 1280, height: 720 };
          },
        },
        {
          getBoundingClientRect() {
            return { width: 0, height: 0 };
          },
        }
      )
    ).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('falls back when the preferred host is hidden or collapsed', () => {
    expect(
      getViewportRenderSize(
        {
          getBoundingClientRect() {
            return { width: 0, height: 0 };
          },
        },
        {
          getBoundingClientRect() {
            return { width: 960, height: 540 };
          },
        }
      )
    ).toEqual({
      width: 960,
      height: 540,
    });
  });

  it('clamps to a minimal render size when every host is collapsed', () => {
    expect(
      getViewportRenderSize({
        getBoundingClientRect() {
          return { width: 0, height: 0 };
        },
      })
    ).toEqual({
      width: 1,
      height: 1,
    });
  });
});
