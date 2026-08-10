import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugPercussionEventSummaries,
  createMusicDebugPercussionVoiceCounts,
} from './music-debug-percussion-report.ts';

export type MusicDebugReportMetadataOptions = {
  variant?: string;
  createdAt?: Date;
};

export type MusicDebugParameterReport = ReturnType<
  typeof buildMusicDebugParameterReport
>;

export function buildMusicDebugParameterReport(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugReportMetadataOptions = {}
) {
  return {
    exportVariant: metadataOptions.variant ?? 'full',
    exportedAt: (metadataOptions.createdAt ?? new Date()).toISOString(),
    options: snapshot.options,
    theme: {
      id: snapshot.theme.id,
      rootHz: snapshot.theme.rootHz,
      rootMidiNote: snapshot.theme.rootMidiNote,
      modeLabel: snapshot.theme.vocabulary.modeLabel,
      motif: snapshot.theme.motif,
      noteDurationMs: snapshot.theme.noteDurationMs,
      baseVolume: snapshot.theme.baseVolume,
    },
    song: {
      durationMs: snapshot.durationMs,
      measureCount: snapshot.measureCount,
      resolvedBpm: snapshot.resolvedBpm,
      loopStartOffsetMs: snapshot.loopStartOffsetMs,
      loopEndOffsetMs: snapshot.loopEndOffsetMs,
      blueprintLabel: snapshot.blueprintLabel,
      chordProgression: snapshot.chordProgression,
      leadMotif: snapshot.leadMotif,
      leadContour: snapshot.leadContour,
      leadContourAnalysis: snapshot.leadContourAnalysis,
      leadPhraseCadence: snapshot.leadPhraseCadence,
      sections: snapshot.song.sections.map((section) => ({
        id: section.id,
        label: section.label,
        startOffsetMs: section.startOffsetMs,
        durationMs: section.durationMs,
        measureCount: section.measureCount,
        startMeasure: section.startMeasure,
        endMeasure: section.endMeasure,
      })),
    },
    songDna: snapshot.songDna,
    instrumentBank: Object.entries(snapshot.instrumentBank.instruments).map(
      ([role, instrument]) => ({
        role,
        id: instrument.id,
        family: instrument.family,
        waveform: instrument.waveform,
        attackMs: instrument.attackMs,
        releaseMs: instrument.releaseMs,
        detuneCents: instrument.detuneCents,
        harmonicGain: instrument.harmonicGain,
        pulseRate: instrument.pulseRate,
        brightness: instrument.brightness,
        timbre: instrument.timbre,
      })
    ),
    trackStats: snapshot.trackStats,
    motifValidation: snapshot.motifValidation,
    timingValidation: snapshot.timingValidation,
    cadenceValidation: snapshot.cadenceValidation,
    percussionValidation: snapshot.percussionValidation,
    songDnaValidation: snapshot.songDnaValidation,
    midiExportValidation: snapshot.midiExportValidation,
    midiAudit: snapshot.midiAudit,
    roleCounts: snapshot.roleCounts,
    percussion: {
      voiceCounts: createMusicDebugPercussionVoiceCounts(snapshot.notes),
      events: createMusicDebugPercussionEventSummaries(snapshot.notes),
    },
    vocabularySummary: snapshot.vocabularySummary,
    sectionLayerArrangement: snapshot.sectionLayerArrangement,
  };
}

export function collectMusicDebugRejectedReportReasons(
  snapshot: MusicDebugSnapshot
): string[] {
  const reasons = [
    ...snapshot.midiExportValidation.messages,
    ...snapshot.motifValidation.messages,
    ...snapshot.timingValidation.messages,
    ...snapshot.cadenceValidation.messages,
    ...snapshot.percussionValidation.messages,
    ...snapshot.songDnaValidation.messages,
  ];
  if (!snapshot.leadContourAnalysis.finalResolvesToTonic) {
    reasons.push(
      ...snapshot.leadContourAnalysis.messages.filter((message) =>
        message.includes('resolved to scale degree')
      )
    );
  }
  if (!snapshot.leadContourAnalysis.climaxNearPlannedPeak) {
    reasons.push(
      ...snapshot.leadContourAnalysis.messages.filter((message) =>
        message.includes('climax peaked at')
      )
    );
  }
  return [...new Set(reasons)];
}
