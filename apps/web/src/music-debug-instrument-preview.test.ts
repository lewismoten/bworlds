import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';

describe('music debug instrument preview player', () => {
  it('disposes the preview sink and stops any active notes', () => {
    const sink = {
      resume: vi.fn(),
      play: vi.fn(),
      stopAll: vi.fn(),
      dispose: vi.fn(),
    };
    const player = createMusicDebugInstrumentPreviewPlayer(sink);

    player.dispose();

    expect(sink.stopAll).toHaveBeenCalledTimes(1);
    expect(sink.dispose).toHaveBeenCalledTimes(1);
  });
});
