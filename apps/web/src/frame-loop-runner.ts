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
  getMaxChunkMeshes: () => number;
  getTextureCount: () => number;
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
      maxChunkMeshes: options.getMaxChunkMeshes(),
      textureCount: options.getTextureCount(),
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
