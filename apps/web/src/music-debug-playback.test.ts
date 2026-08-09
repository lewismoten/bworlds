import { describe, expect, it, vi } from 'vitest';
import {
  createMusicDebugSnapshot,
  type MusicDebugSnapshot,
} from './music-debug.ts';
import { createMusicDebugPlaybackController } from './music-debug-playback.ts';

describe('music debug playback controller', () => {
  it('starts playback, flips state, and auto-stops after the song duration', () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const snapshot = createMusicDebugSnapshot();
    const playback = {
      play: vi.fn((song: MusicDebugSnapshot) => {
        events.push(`play:${song.durationMs}`);
      }),
      stop: vi.fn(() => {
        events.push('stop');
      }),
    };
    const playingStates: boolean[] = [];
    const controller = createMusicDebugPlaybackController({
      playback,
      onPlayingChange: (playing) => {
        playingStates.push(playing);
      },
    });

    controller.start(snapshot);
    expect(controller.isPlaying()).toBe(true);
    expect(playback.play).toHaveBeenCalledWith(snapshot);

    vi.advanceTimersByTime(snapshot.durationMs + 120);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(events).toEqual([`play:${snapshot.durationMs}`, 'stop']);
    expect(playingStates).toEqual([true, false]);
  });

  it('stops the current song when toggled during playback', () => {
    vi.useFakeTimers();
    const snapshot = createMusicDebugSnapshot();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.toggle(snapshot);
    expect(controller.isPlaying()).toBe(true);

    controller.toggle(snapshot);
    expect(controller.isPlaying()).toBe(false);
    expect(playback.play).toHaveBeenCalledTimes(1);
    expect(playback.stop).toHaveBeenCalledTimes(1);
  });

  it('restarts playback cleanly when a new snapshot is started mid-song', () => {
    vi.useFakeTimers();
    const first = createMusicDebugSnapshot({ clusterX: 1, clusterY: 2 });
    const second = createMusicDebugSnapshot({ clusterX: 3, clusterY: 4 });
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(first);
    controller.start(second);

    expect(controller.isPlaying()).toBe(true);
    expect(playback.play).toHaveBeenNthCalledWith(1, first);
    expect(playback.play).toHaveBeenNthCalledWith(2, second);
    expect(playback.stop).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(second.durationMs + 120);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(2);
  });
});
