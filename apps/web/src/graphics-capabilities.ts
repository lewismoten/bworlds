type GraphicsCapabilitiesContextLike = {
  getExtension?(name: string): {
    UNMASKED_RENDERER_WEBGL?: number;
    UNMASKED_VENDOR_WEBGL?: number;
  } | null;
  getParameter?(parameter: number): unknown;
  getContextAttributes?(): {
    antialias?: boolean;
  } | null;
  MAX_TEXTURE_SIZE?: number;
  MAX_CUBE_MAP_TEXTURE_SIZE?: number;
  MAX_RENDERBUFFER_SIZE?: number;
  MAX_VERTEX_UNIFORM_VECTORS?: number;
  MAX_FRAGMENT_UNIFORM_VECTORS?: number;
  MAX_COMBINED_TEXTURE_IMAGE_UNITS?: number;
};

type GraphicsCapabilitiesCanvasLike = {
  getContext(
    kind: 'webgl2' | 'webgl',
    options?: { antialias?: boolean }
  ): GraphicsCapabilitiesContextLike | null;
};

type GraphicsCapabilitiesDocumentLike = {
  createElement(tagName: 'canvas'): GraphicsCapabilitiesCanvasLike;
};

type GraphicsCapabilitiesNavigatorLike = {
  gpu?: unknown;
};

export type GraphicsCapabilitiesSummary = {
  webgpuSupported: boolean;
  webgl2Supported: boolean;
  webglSupported: boolean;
  renderer: string | null;
  vendor: string | null;
  maxTextureSize: number | null;
  maxCubeMapTextureSize: number | null;
  maxRenderbufferSize: number | null;
  maxVertexUniformVectors: number | null;
  maxFragmentUniformVectors: number | null;
  maxCombinedTextureImageUnits: number | null;
  antialias: boolean | null;
};

export function collectGraphicsCapabilities({
  documentLike = typeof document !== 'undefined' ? document : null,
  navigatorLike = typeof navigator !== 'undefined'
    ? (navigator as GraphicsCapabilitiesNavigatorLike)
    : null,
}: {
  documentLike?: GraphicsCapabilitiesDocumentLike | null;
  navigatorLike?: GraphicsCapabilitiesNavigatorLike | null;
} = {}): GraphicsCapabilitiesSummary {
  const canvas = documentLike?.createElement?.('canvas') ?? null;
  const webgl2Context =
    canvas?.getContext('webgl2', { antialias: true }) ?? null;
  const webglContext =
    webgl2Context ?? canvas?.getContext('webgl', { antialias: true }) ?? null;
  const debugExtension =
    webglContext?.getExtension?.('WEBGL_debug_renderer_info') ?? null;

  return {
    webgpuSupported: Boolean(navigatorLike?.gpu),
    webgl2Supported: Boolean(webgl2Context),
    webglSupported: Boolean(webglContext),
    renderer: getOptionalString(
      webglContext,
      debugExtension?.UNMASKED_RENDERER_WEBGL ?? null
    ),
    vendor: getOptionalString(
      webglContext,
      debugExtension?.UNMASKED_VENDOR_WEBGL ?? null
    ),
    maxTextureSize: getOptionalNumber(
      webglContext,
      webglContext?.MAX_TEXTURE_SIZE ?? null
    ),
    maxCubeMapTextureSize: getOptionalNumber(
      webglContext,
      webglContext?.MAX_CUBE_MAP_TEXTURE_SIZE ?? null
    ),
    maxRenderbufferSize: getOptionalNumber(
      webglContext,
      webglContext?.MAX_RENDERBUFFER_SIZE ?? null
    ),
    maxVertexUniformVectors: getOptionalNumber(
      webglContext,
      webglContext?.MAX_VERTEX_UNIFORM_VECTORS ?? null
    ),
    maxFragmentUniformVectors: getOptionalNumber(
      webglContext,
      webglContext?.MAX_FRAGMENT_UNIFORM_VECTORS ?? null
    ),
    maxCombinedTextureImageUnits: getOptionalNumber(
      webglContext,
      webglContext?.MAX_COMBINED_TEXTURE_IMAGE_UNITS ?? null
    ),
    antialias: webglContext?.getContextAttributes?.()?.antialias ?? null,
  };
}

function getOptionalNumber(
  context: GraphicsCapabilitiesContextLike | null,
  parameter: number | null
): number | null {
  if (!context || parameter === null) {
    return null;
  }
  const value = context.getParameter?.(parameter);
  return typeof value === 'number' ? value : null;
}

function getOptionalString(
  context: GraphicsCapabilitiesContextLike | null,
  parameter: number | null
): string | null {
  if (!context || parameter === null) {
    return null;
  }
  const value = context.getParameter?.(parameter);
  return typeof value === 'string' && value.length > 0 ? value : null;
}
