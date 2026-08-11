type RectLike = {
  width: number;
  height: number;
};

type ViewportRectHostLike = {
  getBoundingClientRect(): RectLike;
};

export function getViewportRenderSize(
  primaryHost: ViewportRectHostLike | null | undefined,
  fallbackHost?: ViewportRectHostLike | null
): {
  width: number;
  height: number;
} {
  const primaryRect = primaryHost?.getBoundingClientRect();
  if (
    primaryRect &&
    Number.isFinite(primaryRect.width) &&
    Number.isFinite(primaryRect.height) &&
    primaryRect.width > 0 &&
    primaryRect.height > 0
  ) {
    return {
      width: primaryRect.width,
      height: primaryRect.height,
    };
  }

  const fallbackRect = fallbackHost?.getBoundingClientRect();
  if (
    fallbackRect &&
    Number.isFinite(fallbackRect.width) &&
    Number.isFinite(fallbackRect.height) &&
    fallbackRect.width > 0 &&
    fallbackRect.height > 0
  ) {
    return {
      width: fallbackRect.width,
      height: fallbackRect.height,
    };
  }

  return {
    width: 1,
    height: 1,
  };
}
