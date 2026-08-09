import {
  shouldAdvanceSimulationState,
} from './frame-loop.ts';
import {
  updateRenderBudgetStateInPlace,
  type RenderBudgetState,
} from './render-budget.ts';

type FrameLoopRunnerOptions<T> = {
  renderBudgetState: RenderBudgetState;
  getDrawCalls: () => number;
  getMaxChunkDrawCalls: () => number;
  getMaxChunkObjects: () => number;
  getMaxChunkMeshes: () => number;
  getMaxChunkTriangles: () => number;
  getLightCount: () => number;
  getMaterialCount: () => number;
  getTextureCount: () => number;
  getVisibleObjectCount: () => number;
  getEstimatedGpuMemoryBytes: () => number;
  getVisibleTriangleCount: () => number;
  getVisibleVertexCount: () => number;
  getVisibleMeshCount: () => number;
  getWeatherVisibility: () => number | undefined;
  is3dViewActive: () => boolean;
  isTimeFrozen: () => boolean;
  keys: Iterable<string>;
  isJumping: () => boolean;
  updateMovement: (deltaMs: number) => void;
  render: () => T;
};

export function createFrameLoopRunner<T>(
  options: FrameLoopRunnerOptions<T>
): (deltaMs: number) => T {
  return (deltaMs) => {
    updateRenderBudgetStateInPlace(options.renderBudgetState, {
      deltaMs,
      drawCalls: options.getDrawCalls(),
      maxChunkDrawCalls: options.getMaxChunkDrawCalls(),
      maxChunkObjectCount: options.getMaxChunkObjects(),
      maxChunkMeshes: options.getMaxChunkMeshes(),
      maxChunkTriangleCount: options.getMaxChunkTriangles(),
      totalLightCount: options.getLightCount(),
      materialCount: options.getMaterialCount(),
      textureCount: options.getTextureCount(),
      visibleObjectCount: options.getVisibleObjectCount(),
      estimatedGpuMemoryBytes: options.getEstimatedGpuMemoryBytes(),
      visibleTriangleCount: options.getVisibleTriangleCount(),
      visibleVertexCount: options.getVisibleVertexCount(),
      visibleMeshCount: options.getVisibleMeshCount(),
      active3d: options.is3dViewActive(),
      weatherVisibility: options.getWeatherVisibility(),
    });
    if (
      shouldAdvanceSimulationState(
        options.isTimeFrozen(),
        options.keys,
        options.isJumping()
      )
    ) {
      options.updateMovement(deltaMs);
    }
    return options.render();
  };
}
