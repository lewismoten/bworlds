import {
  createWebAudioMusicSink,
  type MusicSink,
  type ProceduralMusicNote,
} from './procedural-music.ts';

export type MusicDebugInstrumentPreviewAudioState =
  AudioContextState | 'idle' | 'unavailable';

export type MusicDebugInstrumentPreviewPlayer = {
  getAudioState(): MusicDebugInstrumentPreviewAudioState;
  getAudioSampleRate(): number | null;
  getOutputLatencySeconds(): number | null;
  getMasterGain(): number;
  setMasterGain(value: number): number;
  isMuted(): boolean;
  setMuted(value: boolean): boolean;
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
    getAudioSampleRate() {
      return sink.getAudioSampleRate?.() ?? null;
    },
    getOutputLatencySeconds() {
      return sink.getOutputLatencySeconds?.() ?? null;
    },
    getMasterGain() {
      return sink.getMasterGain?.() ?? 1;
    },
    setMasterGain(value) {
      return sink.setMasterGain?.(value) ?? 1;
    },
    isMuted() {
      return sink.isMuted?.() ?? false;
    },
    setMuted(value) {
      return sink.setMuted?.(value) ?? value;
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
