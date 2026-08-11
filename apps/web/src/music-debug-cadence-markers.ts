import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugMeasureStartOffsetMs } from './music-debug-chord-cues.ts';

export type MusicDebugCadenceMarker = {
  sectionId: string;
  sectionLabel: string;
  phraseIndex: number;
  kind: 'question' | 'answer';
  measureNumber: number;
  offsetMs: number;
  shortLabel: 'Q' | 'A';
  label: string;
};

export function resolveMusicDebugCadenceMarkers(
  snapshot: MusicDebugSnapshot
): MusicDebugCadenceMarker[] {
  const markers: MusicDebugCadenceMarker[] = [];

  for (const section of snapshot.song.sections) {
    const phraseCount = Math.max(
      1,
      Math.ceil(section.measureCount / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT)
    );

    for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
      const phraseStartMeasure =
        section.startMeasure +
        phraseIndex * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
      const questionMeasure = phraseStartMeasure + 3;
      const answerMeasure = phraseStartMeasure + 7;

      if (questionMeasure <= section.endMeasure) {
        markers.push(
          createCadenceMarker(
            snapshot,
            section.id,
            section.label,
            phraseIndex,
            {
              kind: 'question',
              measureNumber: questionMeasure,
            }
          )
        );
      }
      if (answerMeasure <= section.endMeasure) {
        markers.push(
          createCadenceMarker(
            snapshot,
            section.id,
            section.label,
            phraseIndex,
            {
              kind: 'answer',
              measureNumber: answerMeasure,
            }
          )
        );
      }
    }
  }

  return markers;
}

function createCadenceMarker(
  snapshot: MusicDebugSnapshot,
  sectionId: string,
  sectionLabel: string,
  phraseIndex: number,
  options: {
    kind: 'question' | 'answer';
    measureNumber: number;
  }
): MusicDebugCadenceMarker {
  const shortLabel = options.kind === 'question' ? 'Q' : 'A';
  return {
    sectionId,
    sectionLabel,
    phraseIndex,
    kind: options.kind,
    measureNumber: options.measureNumber,
    offsetMs: resolveMusicDebugMeasureStartOffsetMs(
      snapshot,
      options.measureNumber
    ),
    shortLabel,
    label: `${sectionLabel} ${options.kind} cadence at measure ${options.measureNumber}`,
  };
}
