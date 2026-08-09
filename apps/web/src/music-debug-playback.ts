import {
  resolveMusicDebugPlaybackDurationMs,
  type MusicDebugPlaybackRegion,
  type MusicDebugSnapshot,
} from './music-debug.ts';

export type MusicDebugPlaybackAdapter = {
  play(
    snapshot: MusicDebugSnapshot,
    region?: MusicDebugPlaybackRegion | null
  ): void;
  stop(): void;
};

export type MusicDebugPlaybackController = {
  isPlaying(): boolean;
  start(snapshot: MusicDebugSnapshot, options?: { loop?: boolean }): void;
  stop(): void;
  toggle(snapshot: MusicDebugSnapshot, options?: { loop?: boolean }): void;
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function createMusicDebugPlaybackController(options: {
  playback: MusicDebugPlaybackAdapter;
  onPlayingChange?: (playing: boolean) => void;
  scheduleTimeout?: typeof setTimeout;
  clearScheduledTimeout?: typeof clearTimeout;
  playbackLeadMs?: number;
}): MusicDebugPlaybackController {
  const scheduleTimeout = options.scheduleTimeout ?? setTimeout;
  const clearScheduledTimeout = options.clearScheduledTimeout ?? clearTimeout;
  const playbackLeadMs = options.playbackLeadMs ?? 16;
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
  }

  function schedulePlaybackStop(options: {
    snapshot: MusicDebugSnapshot;
    region?: MusicDebugPlaybackRegion | null;
    repeatRegion?: MusicDebugPlaybackRegion | null;
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
        playbackStart(options.snapshot, options.repeatRegion);
        schedulePlaybackStop({
          snapshot: options.snapshot,
          region: options.repeatRegion,
          repeatRegion: options.repeatRegion,
        });
        return;
      }

      stop();
    }, durationMs + playbackLeadMs);
  }

  function playbackStart(
    snapshot: MusicDebugSnapshot,
    region?: MusicDebugPlaybackRegion | null
  ): void {
    options.playback.play(snapshot, region);
  }

  function start(
    snapshot: MusicDebugSnapshot,
    startOptions?: { loop?: boolean }
  ): void {
    clearPlaybackTimeout();
    if (playing) {
      options.playback.stop();
    }

    const loopEnabled = startOptions?.loop === true;
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
            startOffsetMs: 0,
            endOffsetMs: loopRegion.endOffsetMs,
          }
        : null;

    playbackStart(snapshot, introRegion);
    setPlaying(true);
    schedulePlaybackStop({
      snapshot,
      region: introRegion,
      repeatRegion: loopEnabled ? loopRegion : null,
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
