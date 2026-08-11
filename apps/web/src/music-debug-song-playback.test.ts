import { describe, expect, it, vi } from 'vitest';
import {
  createMusicDebugSongPlayback,
  createMusicDebugSnapshot,
} from './music-debug.ts';

describe('music debug song playback', () => {
  it('starts debug song playback with a short lead and preserved note spacing', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: 10_000,
      }
    );

    playback.play(snapshot);

    const firstScheduled = play.mock.calls[0]?.[0];
    const secondScheduled = play.mock.calls[1]?.[0];
    const originalFirst = snapshot.notes[0];
    const originalSecond = snapshot.notes[1];

    expect(firstScheduled?.startMs).toBe(1_012);
    expect(secondScheduled?.startMs - firstScheduled?.startMs).toBe(
      (originalSecond?.startMs ?? 0) - (originalFirst?.startMs ?? 0)
    );
  });

  it('caps debug playback note envelopes to keep note attacks responsive', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: 10_000,
      }
    );

    playback.play(snapshot);

    const scheduledLead = play.mock.calls.find(
      ([note]) => note.role === 'lead'
    )?.[0];
    const scheduledHarmony = play.mock.calls.find(
      ([note]) => note.role === 'harmony'
    )?.[0];

    expect(scheduledLead?.attackMs).toBeLessThanOrEqual(24);
    expect(scheduledLead?.releaseMs).toBeLessThanOrEqual(180);
    expect(scheduledHarmony?.attackMs).toBeLessThanOrEqual(24);
    expect(scheduledHarmony?.releaseMs).toBeLessThanOrEqual(180);
  });

  it('schedules debug song playback in rolling batches instead of all at once', () => {
    vi.useFakeTimers();
    let currentNowMs = 1_000;
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => currentNowMs,
        scheduleAheadMs: 12,
        scheduleWindowMs: 48,
        scheduleTickMs: 16,
      }
    );

    playback.play(snapshot);

    const immediateScheduledCount = play.mock.calls.length;
    expect(immediateScheduledCount).toBeGreaterThan(0);
    expect(immediateScheduledCount).toBeLessThan(snapshot.notes.length);
    const nextDeferredNote = snapshot.notes[immediateScheduledCount];
    expect(nextDeferredNote).toBeDefined();

    const nextDeferredStartMs =
      1_012 +
      ((nextDeferredNote?.startMs ?? snapshot.song.startMs) -
        snapshot.song.startMs);
    const advanceMs = Math.max(
      32,
      Math.ceil(nextDeferredStartMs - (1_000 + 48))
    );

    currentNowMs += advanceMs;
    vi.advanceTimersByTime(advanceMs);

    expect(play.mock.calls.length).toBeGreaterThan(immediateScheduledCount);
  });

  it('cancels future debug note batches when playback stops', () => {
    vi.useFakeTimers();
    let currentNowMs = 1_000;
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const stopAll = vi.fn();
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll,
      },
      {
        now: () => currentNowMs,
        scheduleAheadMs: 12,
        scheduleWindowMs: 48,
        scheduleTickMs: 16,
      }
    );

    playback.play(snapshot);
    const scheduledBeforeStop = play.mock.calls.length;

    playback.stop();
    currentNowMs += 128;
    vi.advanceTimersByTime(128);

    expect(stopAll).toHaveBeenCalledTimes(1);
    expect(play.mock.calls.length).toBe(scheduledBeforeStop);
  });

  it('can limit debug song playback to a selected role subset', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: snapshot.durationMs + 1_000,
      }
    );

    playback.play(snapshot, null, { roles: ['bass', 'harmony'] });

    expect(play.mock.calls.length).toBeGreaterThan(0);
    expect(new Set(play.mock.calls.map(([note]) => note.role))).toEqual(
      new Set(['bass', 'harmony'])
    );
  });

  it('can solo a selected percussion voice without dropping non-percussion roles', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const selectedPercussionVoiceId = snapshot.notes
      .find(
        (note) =>
          note.role === 'percussion' &&
          note.instrumentId.includes(':perc-kick-35:')
      )
      ?.instrumentId.match(/:perc-([a-z-]+-\d+):/)?.[1];
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: snapshot.durationMs + 1_000,
      }
    );

    expect(selectedPercussionVoiceId).toBeTruthy();

    playback.play(snapshot, null, {
      percussionVoiceIds: [selectedPercussionVoiceId!],
    });

    const scheduledRoles = new Set(play.mock.calls.map(([note]) => note.role));
    const scheduledPercussionVoiceIds = new Set(
      play.mock.calls
        .filter(([note]) => note.role === 'percussion')
        .map(
          ([note]) => note.instrumentId.match(/:perc-([a-z-]+-\d+):/)?.[1] ?? ''
        )
    );

    expect(scheduledRoles.has('lead')).toBe(true);
    expect(scheduledRoles.has('harmony')).toBe(true);
    expect(scheduledRoles.has('bass')).toBe(true);
    expect(scheduledPercussionVoiceIds).toEqual(
      new Set([selectedPercussionVoiceId])
    );
  });

  it('can schedule a dry debug playback pass without reverb send', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: snapshot.durationMs + 1_000,
      }
    );

    playback.play(snapshot, null, { dry: true });

    const scheduledWithSpace = play.mock.calls.find(
      ([note]) => note.space !== undefined
    )?.[0];

    expect(scheduledWithSpace?.space?.wetGain).toBe(0);
  });
});
