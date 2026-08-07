import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPaintedStandardMaterial } from './index.ts';

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
});
