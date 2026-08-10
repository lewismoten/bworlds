import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugInstrumentPreviewPlayer } from './music-debug-instrument-preview.ts';

describe('music debug instrument preview player', () => {
  it('reports and activates the shared audio context through the preview sink', () => {
    let audioState: AudioContextState | 'idle' | 'unavailable' = 'idle';
    const sink = {
      getAudioState: vi.fn(() => audioState),
      getAudioSampleRate: vi.fn(() => 48_000),
      getOutputLatencySeconds: vi.fn(() => 0.015),
      resume: vi.fn(() => {
        audioState = 'running';
      }),
      play: vi.fn(),
      stopAll: vi.fn(),
      dispose: vi.fn(),
    };
    const player = createMusicDebugInstrumentPreviewPlayer(sink);

    expect(player.getAudioState()).toBe('idle');
    expect(player.getAudioSampleRate()).toBe(48_000);
    expect(player.getOutputLatencySeconds()).toBe(0.015);
    expect(player.start()).toBe('running');
    expect(player.resume()).toBe('running');

    player.play({} as never);

    expect(sink.resume).toHaveBeenCalledTimes(3);
    expect(sink.play).toHaveBeenCalledTimes(1);
  });

  it('disposes the preview sink and stops any active notes', () => {
    const sink = {
      getAudioState: vi.fn(() => 'running' as const),
      getAudioSampleRate: vi.fn(() => 48_000),
      getOutputLatencySeconds: vi.fn(() => 0.015),
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
