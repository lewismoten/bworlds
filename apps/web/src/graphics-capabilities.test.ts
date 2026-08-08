import { describe, expect, it } from 'vitest';
import {
  collectGraphicsCapabilities,
} from './graphics-capabilities.ts';

describe('graphics capabilities', () => {
  it('collects WebGL and WebGPU capability details when available', () => {
    const fakeContext = {
      MAX_TEXTURE_SIZE: 1,
      MAX_CUBE_MAP_TEXTURE_SIZE: 2,
      MAX_RENDERBUFFER_SIZE: 3,
      MAX_VERTEX_UNIFORM_VECTORS: 4,
      MAX_FRAGMENT_UNIFORM_VECTORS: 5,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 6,
      getExtension(name: string) {
        expect(name).toBe('WEBGL_debug_renderer_info');
        return {
          UNMASKED_RENDERER_WEBGL: 7,
          UNMASKED_VENDOR_WEBGL: 8,
        };
      },
      getParameter(parameter: number) {
        return {
          1: 8192,
          2: 4096,
          3: 2048,
          4: 1024,
          5: 512,
          6: 32,
          7: 'Fake GPU',
          8: 'Fake Vendor',
        }[parameter] ?? null;
      },
      getContextAttributes() {
        return { antialias: true };
      },
    };
    const result = collectGraphicsCapabilities({
      navigatorLike: { gpu: {} },
      documentLike: {
        createElement() {
          return {
            getContext(kind: 'webgl2' | 'webgl') {
              return kind === 'webgl2' ? fakeContext : null;
            },
          };
        },
      },
    });

    expect(result).toEqual({
      webgpuSupported: true,
      webgl2Supported: true,
      webglSupported: true,
      renderer: 'Fake GPU',
      vendor: 'Fake Vendor',
      maxTextureSize: 8192,
      maxCubeMapTextureSize: 4096,
      maxRenderbufferSize: 2048,
      maxVertexUniformVectors: 1024,
      maxFragmentUniformVectors: 512,
      maxCombinedTextureImageUnits: 32,
      antialias: true,
    });
  });

  it('gracefully reports missing capabilities when WebGL is unavailable', () => {
    const result = collectGraphicsCapabilities({
      navigatorLike: {},
      documentLike: {
        createElement() {
          return {
            getContext() {
              return null;
            },
          };
        },
      },
    });

    expect(result).toEqual({
      webgpuSupported: false,
      webgl2Supported: false,
      webglSupported: false,
      renderer: null,
      vendor: null,
      maxTextureSize: null,
      maxCubeMapTextureSize: null,
      maxRenderbufferSize: null,
      maxVertexUniformVectors: null,
      maxFragmentUniformVectors: null,
      maxCombinedTextureImageUnits: null,
      antialias: null,
    });
  });
});
