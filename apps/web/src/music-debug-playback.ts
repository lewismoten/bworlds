import type { MusicDebugSnapshot } from './music-debug.ts';

export type MusicDebugPlaybackAdapter = {
  play(snapshot: MusicDebugSnapshot): void;
  stop(): void;
};

export type MusicDebugPlaybackController = {
  isPlaying(): boolean;
  start(snapshot: MusicDebugSnapshot): void;
  stop(): void;
  toggle(snapshot: MusicDebugSnapshot): void;
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
  const playbackLeadMs = options.playbackLeadMs ?? 120;
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

  function start(snapshot: MusicDebugSnapshot): void {
    clearPlaybackTimeout();
    if (playing) {
      options.playback.stop();
    }

    options.playback.play(snapshot);
    setPlaying(true);
    timeoutHandle = scheduleTimeout(() => {
      timeoutHandle = null;
      options.playback.stop();
      setPlaying(false);
    }, snapshot.durationMs + playbackLeadMs);
  }

  return {
    isPlaying() {
      return playing;
    },
    start,
    stop,
    toggle(snapshot) {
      if (playing) {
        stop();
        return;
      }
      start(snapshot);
    },
  };
}
