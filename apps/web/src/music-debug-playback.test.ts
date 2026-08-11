import { describe, expect, it, vi } from 'vitest';
import {
  createMusicDebugSnapshot,
  type MusicDebugSnapshot,
} from './music-debug.ts';
import { createMusicDebugPlaybackController } from './music-debug-playback.ts';
import { resolveMusicDebugSectionJumpTargets } from './music-debug-transport.ts';

const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();
const FOREST_LOOP_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 3,
  clusterY: -2,
});
const FOREST_FULL_SONG_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 5,
  clusterY: -3,
});
const FIRST_RESTART_SNAPSHOT = createMusicDebugSnapshot({
  clusterX: 1,
  clusterY: 2,
});
const SECOND_RESTART_SNAPSHOT = createMusicDebugSnapshot({
  clusterX: 3,
  clusterY: 4,
});
const FOREST_LOOP_JUMP_TARGETS =
  resolveMusicDebugSectionJumpTargets(FOREST_LOOP_SNAPSHOT);

describe('music debug playback controller', () => {
  it('starts playback, flips state, and auto-stops after the song duration', () => {
    vi.useFakeTimers();
    const events: string[] = [];
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

    controller.start(DEFAULT_SNAPSHOT);
    expect(controller.isPlaying()).toBe(true);
    expect(playback.play).toHaveBeenCalledWith(DEFAULT_SNAPSHOT, null);

    vi.advanceTimersByTime(DEFAULT_SNAPSHOT.durationMs + 16);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(events).toEqual([`play:${DEFAULT_SNAPSHOT.durationMs}`, 'stop']);
    expect(playingStates).toEqual([true, false]);
  });

  it('reports playback cycle timing when a song starts', () => {
    vi.useFakeTimers();
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
          endOffsetMs: state.region?.endOffsetMs ?? DEFAULT_SNAPSHOT.durationMs,
          startedAtMs: state.startedAtMs,
        });
      },
    });

    controller.start(DEFAULT_SNAPSHOT, { startOffsetMs: 12_000 });

    expect(cycles).toEqual([
      {
        startOffsetMs: 12_000,
        endOffsetMs: DEFAULT_SNAPSHOT.durationMs,
        startedAtMs: 2_048,
      },
    ]);
  });

  it('keeps full-song playback running past the loop boundary when looping is off', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    expect(FOREST_FULL_SONG_SNAPSHOT.durationMs).toBeGreaterThan(
      FOREST_FULL_SONG_SNAPSHOT.loopEndOffsetMs
    );

    controller.start(FOREST_FULL_SONG_SNAPSHOT);
    vi.advanceTimersByTime(FOREST_FULL_SONG_SNAPSHOT.loopEndOffsetMs + 16);

    expect(controller.isPlaying()).toBe(true);
    expect(playback.play).toHaveBeenCalledWith(FOREST_FULL_SONG_SNAPSHOT, null);

    vi.advanceTimersByTime(
      FOREST_FULL_SONG_SNAPSHOT.durationMs -
        FOREST_FULL_SONG_SNAPSHOT.loopEndOffsetMs
    );

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the current song when toggled during playback', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.toggle(DEFAULT_SNAPSHOT);
    expect(controller.isPlaying()).toBe(true);

    controller.toggle(DEFAULT_SNAPSHOT);
    expect(controller.isPlaying()).toBe(false);
    expect(playback.play).toHaveBeenCalledTimes(1);
    expect(playback.stop).toHaveBeenCalledTimes(1);
  });

  it('restarts playback cleanly when a new snapshot is started mid-song', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(FIRST_RESTART_SNAPSHOT);
    controller.start(SECOND_RESTART_SNAPSHOT);

    expect(controller.isPlaying()).toBe(true);
    expect(playback.play).toHaveBeenNthCalledWith(
      1,
      FIRST_RESTART_SNAPSHOT,
      null
    );
    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      SECOND_RESTART_SNAPSHOT,
      null
    );
    expect(playback.stop).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(SECOND_RESTART_SNAPSHOT.durationMs + 16);

    expect(controller.isPlaying()).toBe(false);
    expect(playback.stop).toHaveBeenCalledTimes(2);
  });

  it('repeats the loopable middle section when looping is enabled', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(FOREST_LOOP_SNAPSHOT, { loop: true });

    expect(playback.play).toHaveBeenNthCalledWith(
      1,
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: 0,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.loopEndOffsetMs,
      })
    );

    vi.advanceTimersByTime(FOREST_LOOP_SNAPSHOT.loopEndOffsetMs + 16);

    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: FOREST_LOOP_SNAPSHOT.loopStartOffsetMs,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.loopEndOffsetMs,
      })
    );
    expect(controller.isPlaying()).toBe(true);

    controller.stop();
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(controller.isPlaying()).toBe(false);
  });

  it('starts looped playback from a seek offset before repeating the loop region', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(FOREST_LOOP_SNAPSHOT, {
      loop: true,
      startOffsetMs: 8_000,
    });

    expect(playback.play).toHaveBeenCalledWith(
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: 8_000,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.loopEndOffsetMs,
      })
    );
  });

  it('forwards selected playback roles to the adapter and keeps them on loop repeats', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });

    controller.start(FOREST_LOOP_SNAPSHOT, {
      loop: true,
      roles: ['lead'],
      dry: true,
    });

    expect(playback.play).toHaveBeenNthCalledWith(
      1,
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: 0,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.loopEndOffsetMs,
      }),
      { roles: ['lead'], dry: true }
    );

    vi.advanceTimersByTime(FOREST_LOOP_SNAPSHOT.loopEndOffsetMs + 16);

    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: FOREST_LOOP_SNAPSHOT.loopStartOffsetMs,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.loopEndOffsetMs,
      }),
      { roles: ['lead'], dry: true }
    );
  });

  it('can jump to a new section offset while the song is already playing', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });
    const nextSection =
      FOREST_LOOP_SNAPSHOT.song.sections[2]?.startOffsetMs ?? 0;

    controller.start(FOREST_LOOP_SNAPSHOT, { startOffsetMs: 0 });
    controller.start(FOREST_LOOP_SNAPSHOT, { startOffsetMs: nextSection });

    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(playback.play).toHaveBeenNthCalledWith(
      1,
      FOREST_LOOP_SNAPSHOT,
      null
    );
    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: nextSection,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.durationMs,
      })
    );
    expect(controller.isPlaying()).toBe(true);
  });

  it('can jump to a section-button target while the song is already playing', () => {
    vi.useFakeTimers();
    const playback = {
      play: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createMusicDebugPlaybackController({
      playback,
    });
    const jumpTarget = FOREST_LOOP_JUMP_TARGETS[2]!;

    controller.start(FOREST_LOOP_SNAPSHOT, { loop: true, startOffsetMs: 0 });
    controller.start(FOREST_LOOP_SNAPSHOT, {
      loop: true,
      startOffsetMs: jumpTarget.startOffsetMs,
    });

    expect(jumpTarget.label).toBe(FOREST_LOOP_SNAPSHOT.song.sections[1]?.label);
    expect(playback.stop).toHaveBeenCalledTimes(1);
    expect(playback.play).toHaveBeenNthCalledWith(
      2,
      FOREST_LOOP_SNAPSHOT,
      expect.objectContaining({
        startOffsetMs: jumpTarget.startOffsetMs,
        endOffsetMs: FOREST_LOOP_SNAPSHOT.loopEndOffsetMs,
      })
    );
    expect(controller.isPlaying()).toBe(true);
  });
});
