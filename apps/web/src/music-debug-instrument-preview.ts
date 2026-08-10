import {
  createWebAudioMusicSink,
  type MusicSink,
  type ProceduralMusicNote,
} from './procedural-music.ts';

export type MusicDebugInstrumentPreviewPlayer = {
  play(note: ProceduralMusicNote): void;
  stop(): void;
  dispose(): void;
};

export function createMusicDebugInstrumentPreviewPlayer(
  sink: MusicSink = createWebAudioMusicSink()
): MusicDebugInstrumentPreviewPlayer {
  return {
    play(note) {
      sink.resume?.();
      sink.play(note);
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
