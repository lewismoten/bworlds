import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { createSingleTilePlugin } from '@bworlds/plugin-api';
import type {
  Create3DModelContext,
  RuntimePlugin,
  ThreeGeometryLike,
  ThreeHostLike,
  ThreeMaterialLike,
} from '@bworlds/plugin-api';

const plainsMeshCache = new WeakMap<
  ThreeHostLike,
  {
    fullGeometry: ThreeGeometryLike;
    lowGeometry: ThreeGeometryLike;
    material: ThreeMaterialLike;
  }
>();

export function createPlainsTilePlugin(): RuntimePlugin {
  return createSingleTilePlugin('tile-plains', {
    kind: 'plains',
    definition: {
      name: 'Plains',
      color: '#7fb069',
      miniColor: '#95c779',
      walkable: true,
      wallHeight: 0,
    },
    paint2D: createPlainsBackedTilePainter(),
    create3DModel({ three, tileX, tileY, detailLevel = 'full' }: Create3DModelContext) {
      const mesh = new three.Mesh(
        getSharedPlainsGeometry(three, detailLevel),
        getSharedPlainsMaterial(three)
      );
      mesh.position.set(tileX, detailLevel === 'low' ? 0.004 : 0.006, tileY);
      mesh.rotation.x = -Math.PI * 0.5;
      (mesh as typeof mesh & { receiveShadow?: boolean }).receiveShadow = true;
      mesh.userData = {
        ...(mesh.userData ?? {}),
        renderStatKind: 'ground',
        plainsDetailLevel: detailLevel,
      };
      return mesh;
    },
  });
}

function getSharedPlainsMaterial(three: ThreeHostLike): ThreeMaterialLike {
  const cached = plainsMeshCache.get(three);
  if (cached) {
    return cached.material;
  }

  const next = {
    fullGeometry: new three.PlaneGeometry(0.94, 0.94),
    lowGeometry: new three.PlaneGeometry(0.88, 0.88),
    material: new three.MeshStandardMaterial({
      color: '#7fb069',
      roughness: 0.98,
      metalness: 0.01,
    }),
  };
  plainsMeshCache.set(three, next);
  return next.material;
}

function getSharedPlainsGeometry(
  three: ThreeHostLike,
  detailLevel: 'full' | 'low'
): ThreeGeometryLike {
  const cached = plainsMeshCache.get(three);
  if (cached) {
    return detailLevel === 'low' ? cached.lowGeometry : cached.fullGeometry;
  }

  getSharedPlainsMaterial(three);
  const initialized = plainsMeshCache.get(three)!;
  return detailLevel === 'low'
    ? initialized.lowGeometry
    : initialized.fullGeometry;
}
