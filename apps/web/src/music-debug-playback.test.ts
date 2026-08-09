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
    expect(playback.play).toHaveBeenCalledWith(snapshot, null);

    vi.advanceTimersByTime(snapshot.durationMs + 16);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(events).toEqual([`play:${snapshot.durationMs}`, 'stop']);
    expect(playingStates).toEqual([true, false]);
  });

  it('reports playback cycle timing when a song starts', () => {
    vi.useFakeTimers();
    const snapshot = createMusicDebugSnapshot();
    const cycles: Array<{
      startOffsetMs: number;
      endOffsetMs: number;
      startedAtMs: number;
    }> = [];
    const playback = {
      play: vi.fn(() => 2_048),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
      onPlaybackCycle(state) {
        cycles.push({
          startOffsetMs: state.region?.startOffsetMs ?? 0,
          endOffsetMs: state.region?.endOffsetMs ?? snapshot.durationMs,
          startedAtMs: state.startedAtMs,
        });
      },
    });

    controller.start(snapshot, { startOffsetMs: 12_000 });

    expect(cycles).toEqual([
      {
        startOffsetMs: 12_000,
        endOffsetMs: snapshot.durationMs,
        startedAtMs: 2_048,
      },
    ]);
  });

  it('keeps full-song playback running past the loop boundary when looping is off', () => {
    vi.useFakeTimers();
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 5,
      clusterY: -3,
    });
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    expect(snapshot.durationMs).toBeGreaterThan(snapshot.loopEndOffsetMs);

    controller.start(snapshot);
    vi.advanceTimersByTime(snapshot.loopEndOffsetMs + 16);

    expect(controller.isPlaying()).toBe(true);
    expect(playback.play).toHaveBeenCalledWith(snapshot, null);

    vi.advanceTimersByTime(snapshot.durationMs - snapshot.loopEndOffsetMs);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(1);
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
    expect(playback.play).toHaveBeenNthCalledWith(1, first, null);
    expect(playback.play).toHaveBeenNthCalledWith(2, second, null);
    expect(playback.stop).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(second.durationMs + 16);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(2);
  });

  it('repeats the loopable middle section when looping is enabled', () => {
    vi.useFakeTimers();
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(snapshot, { loop: true });

    expect(playback.play).toHaveBeenNthCalledWith(
      1,
      snapshot,
      expect.objectContaining({
        startOffsetMs: 0,
        endOffsetMs: snapshot.loopEndOffsetMs,
      })
    );

    vi.advanceTimersByTime(snapshot.loopEndOffsetMs + 16);

    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      snapshot,
      expect.objectContaining({
        startOffsetMs: snapshot.loopStartOffsetMs,
        endOffsetMs: snapshot.loopEndOffsetMs,
      })
    );
    expect(controller.isPlaying()).toBe(true);

    controller.stop();
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(controller.isPlaying()).toBe(false);
  });

  it('starts looped playback from a seek offset before repeating the loop region', () => {
    vi.useFakeTimers();
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(snapshot, {
      loop: true,
      startOffsetMs: 8_000,
    });

    expect(playback.play).toHaveBeenCalledWith(
      snapshot,
      expect.objectContaining({
        startOffsetMs: 8_000,
        endOffsetMs: snapshot.loopEndOffsetMs,
      })
    );
  });

  it('can jump to a new section offset while the song is already playing', () => {
    vi.useFakeTimers();
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });
    const nextSection = snapshot.song.sections[2]?.startOffsetMs ?? 0;

    controller.start(snapshot, { startOffsetMs: 0 });
    controller.start(snapshot, { startOffsetMs: nextSection });

    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(playback.play).toHaveBeenNthCalledWith(1, snapshot, null);
    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      snapshot,
      expect.objectContaining({
        startOffsetMs: nextSection,
        endOffsetMs: snapshot.durationMs,
      })
    );
    expect(controller.isPlaying()).toBe(true);
  });
});
