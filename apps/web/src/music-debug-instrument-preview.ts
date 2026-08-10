import {
  createWebAudioMusicSink,
  type MusicSink,
  type ProceduralMusicNote,
} from './procedural-music.ts';

export type MusicDebugInstrumentPreviewAudioState =
  | AudioContextState
  | 'idle'
  | 'unavailable';

export type MusicDebugInstrumentPreviewPlayer = {
  getAudioState(): MusicDebugInstrumentPreviewAudioState;
  start(): MusicDebugInstrumentPreviewAudioState;
  resume(): MusicDebugInstrumentPreviewAudioState;
  play(note: ProceduralMusicNote): MusicDebugInstrumentPreviewAudioState;
  stop(): void;
  dispose(): void;
};

function getMusicDebugInstrumentPreviewAudioState(
  sink: MusicSink
): MusicDebugInstrumentPreviewAudioState {
  return sink.getAudioState?.() ?? 'unavailable';
}

export function createMusicDebugInstrumentPreviewPlayer(
  sink: MusicSink = createWebAudioMusicSink()
): MusicDebugInstrumentPreviewPlayer {
  return {
    getAudioState() {
      return getMusicDebugInstrumentPreviewAudioState(sink);
    },
    start() {
      sink.resume?.();
      return getMusicDebugInstrumentPreviewAudioState(sink);
    },
    resume() {
      sink.resume?.();
      return getMusicDebugInstrumentPreviewAudioState(sink);
    },
    play(note) {
      sink.resume?.();
      sink.play(note);
      return getMusicDebugInstrumentPreviewAudioState(sink);
    },
    stop() {
      sink.stopAll?.();
    },
    dispose() {
      sink.stopAll?.();
      sink.dispose?.();
    },
  };
}
