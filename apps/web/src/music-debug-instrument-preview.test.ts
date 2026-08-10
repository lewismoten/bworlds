import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';

describe('music debug instrument preview player', () => {
  it('reports and activates the shared audio context through the preview sink', () => {
    let audioState: AudioContextState | 'idle' | 'unavailable' = 'idle';
    const sink = {
      getAudioState: vi.fn(() => audioState),
      resume: vi.fn(() => {
        audioState = 'running';
      }),
      play: vi.fn(),
      stopAll: vi.fn(),
      dispose: vi.fn(),
    };
    const player = createMusicDebugInstrumentPreviewPlayer(sink);

    expect(player.getAudioState()).toBe('idle');
    expect(player.start()).toBe('running');
    expect(player.resume()).toBe('running');

    player.play({} as never);

    expect(sink.resume).toHaveBeenCalledTimes(3);
    expect(sink.play).toHaveBeenCalledTimes(1);
  });

  it('disposes the preview sink and stops any active notes', () => {
    const sink = {
      getAudioState: vi.fn(() => 'running' as const),
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
