import {
  resolveMusicDebugPlaybackDurationMs,
  type MusicDebugPlaybackRegion,
  type MusicDebugSnapshot,
} from './music-debug.ts';

export type MusicDebugPlaybackRole =
  MusicDebugSnapshot['notes'][number]['role'];

export type MusicDebugPlaybackAdapter = {
  play(
    snapshot: MusicDebugSnapshot,
    region?: MusicDebugPlaybackRegion | null,
    options?: {
      roles?: readonly MusicDebugPlaybackRole[];
      percussionVoiceIds?: readonly string[] | null;
      dry?: boolean;
    }
  ): number | void;
  stop(): void;
};

export type MusicDebugPlaybackController = {
  isPlaying(): boolean;
  start(
    snapshot: MusicDebugSnapshot,
    options?: {
      loop?: boolean;
      startOffsetMs?: number;
      roles?: readonly MusicDebugPlaybackRole[];
      percussionVoiceIds?: readonly string[] | null;
      dry?: boolean;
    }
  ): void;
  stop(): void;
  toggle(
    snapshot: MusicDebugSnapshot,
    options?: {
      loop?: boolean;
      startOffsetMs?: number;
      roles?: readonly MusicDebugPlaybackRole[];
      percussionVoiceIds?: readonly string[] | null;
      dry?: boolean;
    }
  ): void;
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function createMusicDebugPlaybackController(options: {
  playback: MusicDebugPlaybackAdapter;
  onPlayingChange?: (playing: boolean) => void;
  onPlaybackCycle?: (state: {
    snapshot: MusicDebugSnapshot;
    region: MusicDebugPlaybackRegion | null;
    startedAtMs: number;
  }) => void;
  onPlaybackStop?: () => void;
  scheduleTimeout?: typeof setTimeout;
  clearScheduledTimeout?: typeof clearTimeout;
  playbackLeadMs?: number;
  now?: () => number;
}): MusicDebugPlaybackController {
  const scheduleTimeout = options.scheduleTimeout ?? setTimeout;
  const clearScheduledTimeout = options.clearScheduledTimeout ?? clearTimeout;
  const playbackLeadMs = options.playbackLeadMs ?? 8;
  const now = options.now ?? performance.now.bind(performance);
  let playing = false;
  let timeoutHandle: TimeoutHandle | null = null;

  function clearPlaybackTimeout(): void {
    if (timeoutHandle === null) {
      return;
    }
    clearScheduledTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  function setPlaying(nextPlaying: boolean): void {
    playing = nextPlaying;
    options.onPlayingChange?.(nextPlaying);
  }

  function stop(): void {
    clearPlaybackTimeout();
    if (!playing) {
      return;
    }
    options.playback.stop();
    setPlaying(false);
    options.onPlaybackStop?.();
  }

  function schedulePlaybackStop(options: {
    snapshot: MusicDebugSnapshot;
    region?: MusicDebugPlaybackRegion | null;
    repeatRegion?: MusicDebugPlaybackRegion | null;
    roles?: readonly MusicDebugPlaybackRole[];
    percussionVoiceIds?: readonly string[] | null;
    dry?: boolean;
  }): void {
    const durationMs = resolveMusicDebugPlaybackDurationMs(
      options.snapshot,
      options.region
    );

    timeoutHandle = scheduleTimeout(() => {
      timeoutHandle = null;
      if (!playing) {
        return;
      }

      if (options.repeatRegion) {
        playbackStart(
          options.snapshot,
          options.repeatRegion,
          options.roles,
          options.percussionVoiceIds,
          options.dry
        );
        schedulePlaybackStop({
          snapshot: options.snapshot,
          region: options.repeatRegion,
          repeatRegion: options.repeatRegion,
          roles: options.roles,
          percussionVoiceIds: options.percussionVoiceIds,
          dry: options.dry,
        });
        return;
      }

      stop();
    }, durationMs + playbackLeadMs);
  }

  function playbackStart(
    snapshot: MusicDebugSnapshot,
    region?: MusicDebugPlaybackRegion | null,
    roles?: readonly MusicDebugPlaybackRole[],
    percussionVoiceIds?: readonly string[] | null,
    dry = false
  ): void {
    const startedAtMs =
      (roles || percussionVoiceIds || dry
        ? options.playback.play(snapshot, region, {
            roles,
            percussionVoiceIds,
            dry,
          })
        : options.playback.play(snapshot, region)) ?? now() + playbackLeadMs;
    options.onPlaybackCycle?.({
      snapshot,
      region: region ?? null,
      startedAtMs,
    });
  }

  function start(
    snapshot: MusicDebugSnapshot,
    startOptions?: {
      loop?: boolean;
      startOffsetMs?: number;
      roles?: readonly MusicDebugPlaybackRole[];
      percussionVoiceIds?: readonly string[] | null;
      dry?: boolean;
    }
  ): void {
    clearPlaybackTimeout();
    if (playing) {
      options.playback.stop();
    }

    const loopEnabled = startOptions?.loop === true;
    const startOffsetMs = Math.min(
      snapshot.durationMs,
      Math.max(0, Math.round(startOptions?.startOffsetMs ?? 0))
    );
    const loopRegion: MusicDebugPlaybackRegion | null =
      snapshot.loopEndOffsetMs > snapshot.loopStartOffsetMs
        ? {
            startOffsetMs: snapshot.loopStartOffsetMs,
            endOffsetMs: snapshot.loopEndOffsetMs,
          }
        : null;
    const introRegion: MusicDebugPlaybackRegion | null =
      loopEnabled && loopRegion
        ? {
            startOffsetMs,
            endOffsetMs:
              startOffsetMs < loopRegion.endOffsetMs
                ? loopRegion.endOffsetMs
                : snapshot.durationMs,
          }
        : startOffsetMs > 0
          ? {
              startOffsetMs,
              endOffsetMs: snapshot.durationMs,
            }
          : null;

    playbackStart(
      snapshot,
      introRegion,
      startOptions?.roles,
      startOptions?.percussionVoiceIds,
      startOptions?.dry === true
    );
    setPlaying(true);
    schedulePlaybackStop({
      snapshot,
      region: introRegion,
      repeatRegion: loopEnabled ? loopRegion : null,
      roles: startOptions?.roles,
      percussionVoiceIds: startOptions?.percussionVoiceIds,
      dry: startOptions?.dry === true,
    });
  }

  return {
    isPlaying() {
      return playing;
    },
    start,
    stop,
    toggle(snapshot, toggleOptions) {
      if (playing) {
        stop();
        return;
      }
      start(snapshot, toggleOptions);
    },
  };
}
