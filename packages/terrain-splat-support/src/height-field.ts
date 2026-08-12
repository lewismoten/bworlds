import type { TerrainSplatSampleGrid } from './sample-grid.ts';

export type TerrainHeightField = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  step: number;
  width: number;
  height: number;
  heights: Float32Array;
};

export type TerrainSplatHeightGeometryPlan = {
  width: number;
  height: number;
  step: number;
  lodStepMultiplier: number;
  vertexCount: number;
  triangleCount: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

export function createTerrainHeightField(params: {
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    step?: number;
  };
  resolveHeight: (position: { x: number; y: number }) => number;
}): TerrainHeightField {
  const step = normalizePositiveStep(params.bounds.step ?? 1);
  const spanX = params.bounds.maxX - params.bounds.minX;
  const spanY = params.bounds.maxY - params.bounds.minY;
  const cellWidth = normalizeIntegralSpan(spanX, step, 'x');
  const cellHeight = normalizeIntegralSpan(spanY, step, 'y');
  const width = cellWidth + 1;
  const height = cellHeight + 1;
  const heights = new Float32Array(width * height);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = params.bounds.minX + column * step;
      const y = params.bounds.minY + row * step;
      heights[row * width + column] = params.resolveHeight({ x, y });
    }
  }

  return {
    minX: params.bounds.minX,
    maxX: params.bounds.maxX,
    minY: params.bounds.minY,
    maxY: params.bounds.maxY,
    step,
    width,
    height,
    heights,
  };
}

export function getTerrainHeightFieldSample(
  field: TerrainHeightField,
  column: number,
  row: number
): number {
  assertInBounds(field.width, field.height, column, row);
  return field.heights[row * field.width + column] ?? 0;
}

export function createTerrainSplatHeightGeometryPlan(params: {
  grid: TerrainSplatSampleGrid;
  heightField: TerrainHeightField;
  lodStepMultiplier?: number;
}): TerrainSplatHeightGeometryPlan {
  assertCompatibleHeightField(params.grid, params.heightField);
  const lodStepMultiplier = normalizeGeometryLodStepMultiplier(
    params.lodStepMultiplier ?? 1
  );
  assertCompatibleGeometryLodStepMultiplier(
    params.heightField,
    lodStepMultiplier
  );
  const vertexWidth =
    Math.floor((params.grid.width - 1) / lodStepMultiplier) + 1;
  const vertexHeight =
    Math.floor((params.grid.height - 1) / lodStepMultiplier) + 1;
  const vertexCount = vertexWidth * vertexHeight;
  const triangleCount = Math.max(0, (vertexWidth - 1) * (vertexHeight - 1) * 2);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(triangleCount * 3);

  let vertexIndex = 0;
  for (let row = 0; row < vertexHeight; row += 1) {
    for (let column = 0; column < vertexWidth; column += 1) {
      const sourceColumn = column * lodStepMultiplier;
      const sourceRow = row * lodStepMultiplier;
      const x =
        params.heightField.minX + sourceColumn * params.heightField.step;
      const z = params.heightField.minY + sourceRow * params.heightField.step;
      positions[vertexIndex * 3] = x;
      positions[vertexIndex * 3 + 1] = getTerrainHeightFieldSample(
        params.heightField,
        sourceColumn,
        sourceRow
      );
      positions[vertexIndex * 3 + 2] = z;
      const normal = resolveTerrainHeightFieldNormal(
        params.heightField,
        sourceColumn,
        sourceRow,
        lodStepMultiplier
      );
      normals[vertexIndex * 3] = normal.x;
      normals[vertexIndex * 3 + 1] = normal.y;
      normals[vertexIndex * 3 + 2] = normal.z;
      uvs[vertexIndex * 2] = vertexWidth > 1 ? column / (vertexWidth - 1) : 0;
      uvs[vertexIndex * 2 + 1] =
        vertexHeight > 1 ? 1 - row / (vertexHeight - 1) : 0;
      vertexIndex += 1;
    }
  }

  let indexOffset = 0;
  for (let row = 0; row < vertexHeight - 1; row += 1) {
    for (let column = 0; column < vertexWidth - 1; column += 1) {
      const topLeft = row * vertexWidth + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + vertexWidth;
      const bottomRight = bottomLeft + 1;
      indices[indexOffset] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = bottomLeft;
      indices[indexOffset + 4] = bottomRight;
      indices[indexOffset + 5] = topRight;
      indexOffset += 6;
    }
  }

  return {
    width: vertexWidth,
    height: vertexHeight,
    step: params.grid.step * lodStepMultiplier,
    lodStepMultiplier,
    vertexCount,
    triangleCount,
    positions,
    normals,
    uvs,
    indices,
  };
}

function resolveTerrainHeightFieldNormal(
  field: TerrainHeightField,
  column: number,
  row: number,
  lodStepMultiplier: number
): { x: number; y: number; z: number } {
  const leftColumn = clampHeightFieldCoordinate(
    column - lodStepMultiplier,
    field.width
  );
  const rightColumn = clampHeightFieldCoordinate(
    column + lodStepMultiplier,
    field.width
  );
  const downRow = clampHeightFieldCoordinate(
    row - lodStepMultiplier,
    field.height
  );
  const upRow = clampHeightFieldCoordinate(
    row + lodStepMultiplier,
    field.height
  );
  const leftHeight = getTerrainHeightFieldSample(field, leftColumn, row);
  const rightHeight = getTerrainHeightFieldSample(field, rightColumn, row);
  const downHeight = getTerrainHeightFieldSample(field, column, downRow);
  const upHeight = getTerrainHeightFieldSample(field, column, upRow);
  const deltaX = (rightColumn - leftColumn) * field.step;
  const deltaZ = (upRow - downRow) * field.step;
  const crossX = -(rightHeight - leftHeight) * deltaZ;
  const crossY = deltaX * deltaZ;
  const crossZ = -(upHeight - downHeight) * deltaX;
  const length = Math.hypot(crossX, crossY, crossZ);

  if (length <= 0 || !Number.isFinite(length)) {
    return { x: 0, y: 1, z: 0 };
  }

  return {
    x: crossX / length,
    y: crossY / length,
    z: crossZ / length,
  };
}

function assertCompatibleHeightField(
  grid: TerrainSplatSampleGrid,
  heightField: TerrainHeightField
): void {
  if (grid.minX !== heightField.minX || grid.minY !== heightField.minY) {
    throw new Error(
      'Terrain splat height field must share the same minimum bounds as the splat grid.'
    );
  }
  if (grid.maxX !== heightField.maxX || grid.maxY !== heightField.maxY) {
    throw new Error(
      'Terrain splat height field must share the same maximum bounds as the splat grid.'
    );
  }
  if (grid.step !== heightField.step) {
    throw new Error(
      `Terrain splat height field step ${heightField.step} must match splat grid step ${grid.step}.`
    );
  }
  if (heightField.width !== grid.width || heightField.height !== grid.height) {
    throw new Error(
      `Terrain splat height field dimensions ${heightField.width}x${heightField.height} must equal splat grid dimensions ${grid.width}x${grid.height}.`
    );
  }
}

function assertCompatibleGeometryLodStepMultiplier(
  heightField: TerrainHeightField,
  lodStepMultiplier: number
): void {
  const columnSpan = heightField.width - 1;
  const rowSpan = heightField.height - 1;
  if (columnSpan % lodStepMultiplier !== 0) {
    throw new Error(
      `Terrain splat height geometry lodStepMultiplier ${lodStepMultiplier} must divide width span ${columnSpan}.`
    );
  }
  if (rowSpan % lodStepMultiplier !== 0) {
    throw new Error(
      `Terrain splat height geometry lodStepMultiplier ${lodStepMultiplier} must divide height span ${rowSpan}.`
    );
  }
}

function normalizePositiveStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    throw new Error(
      'Terrain height field step must be a positive finite number.'
    );
  }
  return step;
}

function normalizeGeometryLodStepMultiplier(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      'Terrain splat height geometry lodStepMultiplier must be a positive integer.'
    );
  }
  return value;
}

function normalizeIntegralSpan(
  span: number,
  step: number,
  axis: 'x' | 'y'
): number {
  if (!Number.isFinite(span) || span < 0) {
    throw new Error(
      `Terrain height field ${axis}-axis span must be non-negative.`
    );
  }
  const cellCount = span / step;
  if (!Number.isInteger(cellCount)) {
    throw new Error(
      `Terrain height field ${axis}-axis span ${span} must divide evenly by step ${step}.`
    );
  }
  return cellCount;
}

function assertInBounds(
  width: number,
  height: number,
  column: number,
  row: number
): void {
  if (column < 0 || column >= width || row < 0 || row >= height) {
    throw new Error(
      `Terrain height field sample coordinates ${column}:${row} are outside ${width}x${height}.`
    );
  }
}

function clampHeightFieldCoordinate(value: number, size: number): number {
  if (value < 0) {
    return 0;
  }
  if (value >= size) {
    return size - 1;
  }
  return value;
}
