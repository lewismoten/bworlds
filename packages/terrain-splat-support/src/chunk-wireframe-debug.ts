import type { TerrainSplatHeightGeometryPlan } from './height-field.ts';

export type TerrainChunkWireframeDebugSegmentKind =
  'horizontal' | 'vertical' | 'diagonal';

export type TerrainChunkWireframeDebugPoint = {
  x: number;
  y: number;
  z: number;
};

export type TerrainChunkWireframeDebugSegment = {
  kind: TerrainChunkWireframeDebugSegmentKind;
  border: boolean;
  start: TerrainChunkWireframeDebugPoint;
  end: TerrainChunkWireframeDebugPoint;
};

export type TerrainChunkWireframeDebugView = {
  width: number;
  height: number;
  vertexCount: number;
  triangleCount: number;
  segmentCount: number;
  borderSegmentCount: number;
  includeDiagonals: boolean;
  segments: readonly TerrainChunkWireframeDebugSegment[];
};

export function createTerrainChunkWireframeDebugView(params: {
  geometryPlan: TerrainSplatHeightGeometryPlan;
  includeDiagonals?: boolean;
}): TerrainChunkWireframeDebugView {
  const includeDiagonals = params.includeDiagonals === true;
  const segmentMap = new Map<string, TerrainChunkWireframeDebugSegment>();

  for (
    let offset = 0;
    offset < params.geometryPlan.indices.length;
    offset += 3
  ) {
    const triangle = [
      params.geometryPlan.indices[offset] ?? 0,
      params.geometryPlan.indices[offset + 1] ?? 0,
      params.geometryPlan.indices[offset + 2] ?? 0,
    ] as const;
    addSegment(
      segmentMap,
      params.geometryPlan,
      triangle[0],
      triangle[1],
      includeDiagonals
    );
    addSegment(
      segmentMap,
      params.geometryPlan,
      triangle[1],
      triangle[2],
      includeDiagonals
    );
    addSegment(
      segmentMap,
      params.geometryPlan,
      triangle[2],
      triangle[0],
      includeDiagonals
    );
  }

  const segments = [...segmentMap.values()];

  return {
    width: params.geometryPlan.width,
    height: params.geometryPlan.height,
    vertexCount: params.geometryPlan.vertexCount,
    triangleCount: params.geometryPlan.triangleCount,
    segmentCount: segments.length,
    borderSegmentCount: segments.filter((segment) => segment.border).length,
    includeDiagonals,
    segments,
  };
}

function addSegment(
  segmentMap: Map<string, TerrainChunkWireframeDebugSegment>,
  geometryPlan: TerrainSplatHeightGeometryPlan,
  firstIndex: number,
  secondIndex: number,
  includeDiagonals: boolean
): void {
  const normalized =
    firstIndex < secondIndex
      ? [firstIndex, secondIndex]
      : [secondIndex, firstIndex];
  const key = `${normalized[0]}:${normalized[1]}`;
  if (segmentMap.has(key)) {
    return;
  }

  const firstColumn = normalized[0] % geometryPlan.width;
  const firstRow = Math.floor(normalized[0] / geometryPlan.width);
  const secondColumn = normalized[1] % geometryPlan.width;
  const secondRow = Math.floor(normalized[1] / geometryPlan.width);
  const kind = resolveSegmentKind(
    firstColumn,
    firstRow,
    secondColumn,
    secondRow
  );

  if (kind === 'diagonal' && !includeDiagonals) {
    return;
  }

  segmentMap.set(key, {
    kind,
    border: isBorderSegment(
      geometryPlan.width,
      geometryPlan.height,
      firstColumn,
      firstRow,
      secondColumn,
      secondRow
    ),
    start: readPoint(geometryPlan, normalized[0]),
    end: readPoint(geometryPlan, normalized[1]),
  });
}

function resolveSegmentKind(
  firstColumn: number,
  firstRow: number,
  secondColumn: number,
  secondRow: number
): TerrainChunkWireframeDebugSegmentKind {
  if (firstRow === secondRow) {
    return 'horizontal';
  }
  if (firstColumn === secondColumn) {
    return 'vertical';
  }
  return 'diagonal';
}

function isBorderSegment(
  width: number,
  height: number,
  firstColumn: number,
  firstRow: number,
  secondColumn: number,
  secondRow: number
): boolean {
  return (
    (firstRow === 0 && secondRow === 0) ||
    (firstRow === height - 1 && secondRow === height - 1) ||
    (firstColumn === 0 && secondColumn === 0) ||
    (firstColumn === width - 1 && secondColumn === width - 1)
  );
}

function readPoint(
  geometryPlan: TerrainSplatHeightGeometryPlan,
  vertexIndex: number
): TerrainChunkWireframeDebugPoint {
  const offset = vertexIndex * 3;
  return {
    x: geometryPlan.positions[offset] ?? 0,
    y: geometryPlan.positions[offset + 1] ?? 0,
    z: geometryPlan.positions[offset + 2] ?? 0,
  };
}
