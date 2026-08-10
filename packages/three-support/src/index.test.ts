import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThreeTextureLike } from '@bworlds/plugin-api';
import {
  applyPixelArtTextureSampling,
  applySurfaceTextureSampling,
  createBasicMaterial,
  createPaintedStandardMaterial,
  createTexturedPlaneMesh,
  getSharedBoxGeometry,
  getSharedConeGeometry,
  getSharedCylinderGeometry,
  getOrCreatePaintedCanvasTextureTyped,
  getSharedPlaneGeometry,
  SHARED_HOST_GEOMETRY_CACHE_MAX_ENTRIES,
  getSharedSphereGeometry,
} from './index.ts';

describe('three support', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalDocument) {
      globalThis.document = originalDocument;
    } else {
      delete (globalThis as { document?: Document }).document;
    }
  });

  it('creates textured standard materials from painted canvas helpers', () => {
    const fillRect = vi.fn();
    const fakeContext = {
      fillStyle: '',
      fillRect,
    } as unknown as CanvasRenderingContext2D;
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => fakeContext),
    } as unknown as HTMLCanvasElement;
    globalThis.document = {
      createElement: vi.fn(() => fakeCanvas),
    } as unknown as Document;

    class FakeCanvasTexture {
      image: HTMLCanvasElement;
      colorSpace?: string;
      magFilter?: string;
      minFilter?: string;
      generateMipmaps?: boolean;
      needsUpdate?: boolean;
      wrapS?: string;
      wrapT?: string;
      repeat = {
        set: vi.fn(),
      };

      constructor(image: HTMLCanvasElement) {
        this.image = image;
      }
    }

    class FakeMeshStandardMaterial {
      options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        this.options = options;
      }
    }

    const material = createPaintedStandardMaterial(
      {
        CanvasTexture: FakeCanvasTexture,
        MeshStandardMaterial: FakeMeshStandardMaterial,
        SRGBColorSpace: 'srgb',
        LinearFilter: 'linear',
        LinearMipmapLinearFilter: 'linear-mipmap-linear',
        NearestFilter: 'nearest',
        RepeatWrapping: 'repeat',
      },
      {
        color: '#abcdef',
        roughness: 0.8,
        metalness: 0.1,
        width: 16,
        height: 16,
        repeatX: 2,
        repeatY: 3,
        paint(context, canvas) {
          context.fillStyle = '#123456';
          context.fillRect(0, 0, canvas.width, canvas.height);
        },
      }
    ) as FakeMeshStandardMaterial;

    expect(fillRect).toHaveBeenCalledWith(0, 0, 16, 16);
    expect(material.options).toEqual(
      expect.objectContaining({
        color: '#abcdef',
        roughness: 0.8,
        metalness: 0.1,
        map: expect.any(FakeCanvasTexture),
      })
    );
    expect(
      (material.options.map as FakeCanvasTexture).repeat.set
    ).toHaveBeenCalledWith(2, 3);
    expect(material.options.map).toEqual(
      expect.objectContaining({
        anisotropy: 4,
        generateMipmaps: true,
        magFilter: 'linear',
        minFilter: 'linear-mipmap-linear',
        needsUpdate: true,
      })
    );
  });

  it('memoizes painted canvas textures by key', () => {
    const fillRect = vi.fn();
    const fakeContext = {
      fillStyle: '',
      fillRect,
    } as unknown as CanvasRenderingContext2D;
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => fakeContext),
    } as unknown as HTMLCanvasElement;
    globalThis.document = {
      createElement: vi.fn(() => fakeCanvas),
    } as unknown as Document;

    class FakeCanvasTexture {
      image: HTMLCanvasElement;
      colorSpace?: string;
      magFilter?: string;
      minFilter?: string;
      generateMipmaps?: boolean;
      needsUpdate?: boolean;
      wrapS?: string;
      wrapT?: string;
      repeat = {
        set: vi.fn(),
      };

      constructor(image: HTMLCanvasElement) {
        this.image = image;
      }
    }

    const cache = new Map<string, FakeCanvasTexture>();
    const three = {
      CanvasTexture: FakeCanvasTexture,
      SRGBColorSpace: 'srgb',
      LinearFilter: 'linear',
      LinearMipmapLinearFilter: 'linear-mipmap-linear',
      NearestFilter: 'nearest',
      RepeatWrapping: 'repeat',
    };

    const first = getOrCreatePaintedCanvasTextureTyped(
      cache,
      'sign:starter',
      three,
      {
        width: 32,
        height: 16,
        wrap: false,
        paint(context, canvas) {
          context.fillStyle = '#abcdef';
          context.fillRect(0, 0, canvas.width, canvas.height);
        },
      }
    );
    const second = getOrCreatePaintedCanvasTextureTyped(
      cache,
      'sign:starter',
      three,
      {
        width: 32,
        height: 16,
        wrap: false,
        paint() {
          throw new Error('cached texture should be reused');
        },
      }
    );

    expect(first).toBe(second);
    expect(fillRect).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(1);
  });

  it('creates textured plane meshes with shared transparent material defaults', () => {
    class FakePlaneGeometry {
      width: number;
      height: number;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }
    }

    class FakeMeshBasicMaterial {
      options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        this.options = options;
      }
    }

    class FakeMesh {
      geometry: object | undefined;
      material: object | undefined;
      position = {
        x: 0,
        y: 0,
        z: 0,
        set: vi.fn(() => this.position),
      };
      rotation = {
        x: 0,
        y: 0,
        z: 0,
      };
      scale = {
        x: 1,
        y: 1,
        z: 1,
        set: vi.fn(() => this.scale),
        setScalar: vi.fn(() => this.scale),
      };

      constructor(geometry: object | undefined, material: object | undefined) {
        this.geometry = geometry;
        this.material = material;
      }

      add = vi.fn(() => this);
    }

    const texture: ThreeTextureLike & { id: string } = {
      id: 'label-texture',
      needsUpdate: false,
    };
    const mesh = createTexturedPlaneMesh(
      {
        PlaneGeometry: FakePlaneGeometry,
        MeshBasicMaterial: FakeMeshBasicMaterial,
        Mesh: FakeMesh,
      },
      {
        width: 1.2,
        height: 0.6,
        texture,
      }
    ) as FakeMesh;

    expect(mesh.geometry).toEqual(
      expect.objectContaining({
        width: 1.2,
        height: 0.6,
      })
    );
    expect(mesh.material).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({
          map: texture,
          transparent: true,
          depthWrite: false,
        }),
      })
    );
  });

  it('applies pixel-art texture sampling without mipmaps or high anisotropy', () => {
    const texture = {};

    expect(
      applyPixelArtTextureSampling(texture, {
        NearestFilter: 'nearest',
      })
    ).toBe(texture);
    expect(texture).toEqual({
      anisotropy: 1,
      generateMipmaps: false,
      magFilter: 'nearest',
      minFilter: 'nearest',
      needsUpdate: true,
    });
  });

  it('caps surface texture anisotropy by quality instead of pushing every texture to the maximum', () => {
    const full = {};
    const reduced = {};
    const minimal = {};
    const host = {
      LinearFilter: 'linear',
      LinearMipmapLinearFilter: 'linear-mipmap-linear',
    };

    applySurfaceTextureSampling(full, host, 'full');
    applySurfaceTextureSampling(reduced, host, 'reduced');
    applySurfaceTextureSampling(minimal, host, 'minimal');

    expect(full).toEqual({
      anisotropy: 4,
      generateMipmaps: true,
      magFilter: 'linear',
      minFilter: 'linear-mipmap-linear',
      needsUpdate: true,
    });
    expect(reduced).toEqual({
      anisotropy: 2,
      generateMipmaps: true,
      magFilter: 'linear',
      minFilter: 'linear-mipmap-linear',
      needsUpdate: true,
    });
    expect(minimal).toEqual({
      anisotropy: 1,
      generateMipmaps: false,
      magFilter: 'linear',
      minFilter: 'linear',
      needsUpdate: true,
    });
  });

  it('reuses shared primitive geometries per host and dimensions', () => {
    class FakeBoxGeometry {
      constructor(
        public width: number,
        public height: number,
        public depth: number
      ) {}
    }
    class FakeConeGeometry {
      constructor(
        public radius: number,
        public height: number,
        public radialSegments: number
      ) {}
    }
    class FakeCylinderGeometry {
      constructor(
        public radiusTop: number,
        public radiusBottom: number,
        public height: number,
        public radialSegments: number
      ) {}
    }
    class FakePlaneGeometry {
      constructor(
        public width: number,
        public height: number
      ) {}
    }
    class FakeSphereGeometry {
      constructor(
        public radius: number,
        public widthSegments: number,
        public heightSegments: number
      ) {}
    }

    const host = {
      BoxGeometry: FakeBoxGeometry,
      ConeGeometry: FakeConeGeometry,
      CylinderGeometry: FakeCylinderGeometry,
      PlaneGeometry: FakePlaneGeometry,
      SphereGeometry: FakeSphereGeometry,
    };

    expect(getSharedBoxGeometry(host, 1, 2, 3)).toBe(
      getSharedBoxGeometry(host, 1, 2, 3)
    );
    expect(getSharedConeGeometry(host, 0.5, 1.5, 8)).toBe(
      getSharedConeGeometry(host, 0.5, 1.5, 8)
    );
    expect(getSharedCylinderGeometry(host, 0.5, 0.7, 1.2, 6)).toBe(
      getSharedCylinderGeometry(host, 0.5, 0.7, 1.2, 6)
    );
    expect(getSharedPlaneGeometry(host, 2, 1)).toBe(
      getSharedPlaneGeometry(host, 2, 1)
    );
    expect(getSharedSphereGeometry(host, 0.4, 6, 5)).toBe(
      getSharedSphereGeometry(host, 0.4, 6, 5)
    );
    expect(getSharedSphereGeometry(host, 0.4, 6, 5)).not.toBe(
      getSharedSphereGeometry(host, 0.5, 6, 5)
    );

    const baselineBox = getSharedBoxGeometry(host, 1, 2, 3) as FakeBoxGeometry;
    const baselineSphere = getSharedSphereGeometry(
      host,
      0.4,
      6,
      5
    ) as FakeSphereGeometry;

    for (
      let index = 0;
      index < SHARED_HOST_GEOMETRY_CACHE_MAX_ENTRIES + 32;
      index += 1
    ) {
      getSharedBoxGeometry(host, 1 + index * 0.01, 2, 3);
      getSharedConeGeometry(host, 0.5 + index * 0.01, 1.5, 8);
      getSharedCylinderGeometry(host, 0.5, 0.7 + index * 0.01, 1.2, 6);
      getSharedPlaneGeometry(host, 2 + index * 0.01, 1);
      getSharedSphereGeometry(host, 0.4 + index * 0.01, 6, 5);
    }

    const resolvedBox = getSharedBoxGeometry(host, 1, 2, 3) as FakeBoxGeometry;
    const resolvedSphere = getSharedSphereGeometry(
      host,
      0.4,
      6,
      5
    ) as FakeSphereGeometry;

    expect(resolvedBox).not.toBe(baselineBox);
    expect(resolvedSphere).not.toBe(baselineSphere);
    expect({
      width: resolvedBox.width,
      height: resolvedBox.height,
      depth: resolvedBox.depth,
    }).toEqual({
      width: baselineBox.width,
      height: baselineBox.height,
      depth: baselineBox.depth,
    });
    expect({
      radius: resolvedSphere.radius,
      widthSegments: resolvedSphere.widthSegments,
      heightSegments: resolvedSphere.heightSegments,
    }).toEqual({
      radius: baselineSphere.radius,
      widthSegments: baselineSphere.widthSegments,
      heightSegments: baselineSphere.heightSegments,
    });
  });

  it('creates shared basic materials for simple flat surfaces', () => {
    class FakeMeshBasicMaterial {
      options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        this.options = options;
      }
    }

    const material = createBasicMaterial(
      {
        MeshBasicMaterial: FakeMeshBasicMaterial,
      },
      {
        color: '#010308',
        side: 'double',
        depthWrite: false,
      }
    ) as FakeMeshBasicMaterial;

    expect(material.options).toEqual(
      expect.objectContaining({
        color: '#010308',
        side: 'double',
        depthWrite: false,
      })
    );
    expect(material.options).not.toHaveProperty('map');
    expect(material.options).not.toHaveProperty('transparent');
  });

  it('omits undefined optional material parameters', () => {
    class FakeMeshStandardMaterial {
      options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        this.options = options;
      }
    }

    class FakeCanvasTexture {
      repeat = {
        set: vi.fn(),
      };

      constructor(public image: HTMLCanvasElement) {}
    }

    const fakeContext = {
      fillStyle: '',
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => fakeContext),
    } as unknown as HTMLCanvasElement;
    globalThis.document = {
      createElement: vi.fn(() => fakeCanvas),
    } as unknown as Document;

    const material = createPaintedStandardMaterial(
      {
        CanvasTexture: FakeCanvasTexture,
        MeshStandardMaterial: FakeMeshStandardMaterial,
        SRGBColorSpace: 'srgb',
        LinearFilter: 'linear',
        LinearMipmapLinearFilter: 'linear-mipmap-linear',
        NearestFilter: 'nearest',
        RepeatWrapping: 'repeat',
      },
      {
        width: 8,
        height: 8,
        paint() {},
      }
    ) as FakeMeshStandardMaterial;

    expect(material.options).not.toHaveProperty('emissive');
    expect(material.options).not.toHaveProperty('emissiveIntensity');
    expect(material.options).not.toHaveProperty('transparent');
    expect(material.options).not.toHaveProperty('opacity');
    expect(material.options).not.toHaveProperty('side');
  });
});
