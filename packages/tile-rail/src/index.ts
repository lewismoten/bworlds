import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import { createRouteTraversalProfile } from '@bworlds/tile-support';
import {
  createBasicMaterial,
  getSharedBoxGeometry,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  Create3DModelProgress,
  Kind,
  RuntimePlugin,
  ThreeMaterialLike,
  ThreeMatrix4Like,
  ThreeHostLike,
} from '@bworlds/plugin-api';

const railMaterialCache = new WeakMap<
  object,
  {
    sleeperMaterial: ThreeMaterialLike;
    railMaterial: ThreeMaterialLike;
  }
>();

export function createRailTilePlugin(): RuntimePlugin {
  return createTilePlugin('tile-rail', [
    {
      kind: 'rail',
      definition: {
        name: 'Rail Track',
        color: '#7a4a28',
        miniColor: '#b08968',
        walkable: true,
        wallHeight: 0,
      },
      getTraversalProfile3D() {
        return createRouteTraversalProfile();
      },
      paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
        fillRect(context, x + 1, y + 5, 14, 2, '#5c3a21');
        fillRect(context, x + 1, y + 9, 14, 2, '#5c3a21');
        fillRect(context, x + 2, y + 6, 2, 4, '#c7b299');
        fillRect(context, x + 6, y + 6, 2, 4, '#c7b299');
        fillRect(context, x + 10, y + 6, 2, 4, '#c7b299');
        return true;
      }),
      create3DModel(context: Create3DModelContext) {
        return runRailModelBuildToCompletion(
          createRailModelProgressive(context)
        );
      },
      create3DModelProgressive(context: Create3DModelContext) {
        return createRailModelProgressive(context);
      },
    },
  ]);
}

function* createRailModelProgressive({
  three,
  state,
  tileX,
  tileY,
}: Create3DModelContext): Generator<Create3DModelProgress, unknown, void> {
  if (state.getCurrentContext().type !== 'overworld') {
    return null;
  }

  const group = new three.Group();
  const { sleeperMaterial, railMaterial } = getRailSharedMaterials(three);
  group.position.set(tileX, 0, tileY);
  const totalSteps = 2;

  const rotation = resolveRailRotation(state, tileX, tileY);

  const railInstances = new three.InstancedMesh(
    getSharedBoxGeometry(three, 0.92, 0.05, 0.06),
    railMaterial,
    2
  );
  railInstances.userData = {
    ...railInstances.userData,
    railInstancedPart: 'rail',
  };
  railInstances.rotation.y = rotation;
  const railMatrixScratch = new three.Matrix4();
  for (const [index, offset] of [-0.22, 0.22].entries()) {
    railInstances.setMatrixAt(
      index,
      writeScalePositionMatrix(railMatrixScratch, 0, 0.08, offset, 1, 1, 1)
    );
  }
  group.add(railInstances);
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'rails',
  };

  const sleeperInstances = new three.InstancedMesh(
    getSharedBoxGeometry(three, 0.14, 0.04, 0.56),
    sleeperMaterial,
    4
  );
  sleeperInstances.userData = {
    ...sleeperInstances.userData,
    railInstancedPart: 'sleeper',
  };
  sleeperInstances.rotation.y = rotation;
  const sleeperMatrixScratch = new three.Matrix4();
  const sleeperOffsets = [-0.32, -0.12, 0.08, 0.28];
  for (let index = 0; index < sleeperOffsets.length; index += 1) {
    sleeperInstances.setMatrixAt(
      index,
      writeScalePositionMatrix(
        sleeperMatrixScratch,
        sleeperOffsets[index]!,
        0.04,
        0,
        1,
        1,
        1
      )
    );
  }
  group.add(sleeperInstances);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'sleepers',
  };

  return group;
}

function resolveRailRotation(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
) {
  const horizontal =
    hasConnection(state, tileX, tileY, 'east') ||
    hasConnection(state, tileX, tileY, 'west');
  const vertical =
    hasConnection(state, tileX, tileY, 'north') ||
    hasConnection(state, tileX, tileY, 'south');
  const diagonalSlash =
    hasConnection(state, tileX, tileY, 'northeast') ||
    hasConnection(state, tileX, tileY, 'southwest');
  const diagonalBackslash =
    hasConnection(state, tileX, tileY, 'northwest') ||
    hasConnection(state, tileX, tileY, 'southeast');
  return diagonalSlash && !horizontal && !vertical
    ? -Math.PI / 4
    : diagonalBackslash && !horizontal && !vertical
      ? Math.PI / 4
      : vertical && !horizontal
        ? Math.PI / 2
        : 0;
}

function runRailModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function writeScalePositionMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return target.makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}

function getRailSharedMaterials(three: ThreeHostLike) {
  let cached = railMaterialCache.get(three as object);
  if (!cached) {
    cached = {
      sleeperMaterial: createBasicMaterial(three, { color: '#7c5836' }),
      railMaterial: createBasicMaterial(three, { color: '#9ca3af' }),
    };
    railMaterialCache.set(three as object, cached);
  }
  return cached;
}

function hasConnection(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number,
  direction:
    | 'north'
    | 'east'
    | 'south'
    | 'west'
    | 'northeast'
    | 'southeast'
    | 'southwest'
    | 'northwest'
) {
  const offsets: Record<typeof direction, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 },
    northeast: { dx: 1, dy: -1 },
    southeast: { dx: 1, dy: 1 },
    southwest: { dx: -1, dy: 1 },
    northwest: { dx: -1, dy: -1 },
  };
  const offset = offsets[direction];
  return isRailNetworkKind(
    state.getCurrentTile(tileX + offset.dx, tileY + offset.dy).kind
  );
}

function isRailNetworkKind(kind: Kind): boolean {
  return kind === 'rail' || kind === 'station';
}
