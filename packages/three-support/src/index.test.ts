import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createBasicMaterial,
  createPaintedStandardMaterial,
  createTexturedPlaneMesh,
  getOrCreatePaintedCanvasTexture,
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
      NearestFilter: 'nearest',
      RepeatWrapping: 'repeat',
    };

    const first = getOrCreatePaintedCanvasTexture(
      cache as unknown as Map<string, any>,
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
    const second = getOrCreatePaintedCanvasTexture(
      cache as unknown as Map<string, any>,
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
      geometry: unknown;
      material: unknown;

      constructor(geometry: unknown, material: unknown) {
        this.geometry = geometry;
        this.material = material;
      }
    }

    const texture = { id: 'label-texture' };
    const mesh = createTexturedPlaneMesh(
      {
        PlaneGeometry: FakePlaneGeometry,
        MeshBasicMaterial: FakeMeshBasicMaterial,
        Mesh: FakeMesh,
      },
      {
        width: 1.2,
        height: 0.6,
        texture: texture as any,
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
  });
});
