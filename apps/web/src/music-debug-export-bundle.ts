import type { MusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugInstrumentPreviewNote } from './music-debug-instrument-panel.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import {
  type MusicDebugMidiMetadataOptions,
} from './music-debug-midi.ts';
import {
  createMusicDebugPreviewWavFile,
  type MusicDebugPreviewWavFile,
} from './music-debug-preview-wav.ts';
import { createStoredZipArchive } from './zip-file.ts';

export type MusicDebugExportBundleFile = {
  fileName: string;
  bytes: Uint8Array;
  mimeType: string;
};

export type MusicDebugExportBundle = MusicDebugExportBundleFile & {
  entries: readonly MusicDebugExportBundleFile[];
};

type MusicDebugExportBundleDownloadEnvironment = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => MusicDebugExportBundleAnchor;
  appendAnchor: (anchor: MusicDebugExportBundleAnchor) => void;
};

type MusicDebugExportBundleAnchor = {
  href: string;
  download: string;
  click(): void;
  remove(): void;
};

type BrowserMusicDebugExportBundleDownloadEnvironment = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => HTMLAnchorElement;
  appendAnchor: (anchor: HTMLAnchorElement) => void;
};

export function createMusicDebugExportBundle(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugExportBundle {
  const midiFile = createMusicDebugMidiFile(snapshot, metadataOptions);
  const reportFile = createMusicDebugParameterReportFile(
    snapshot,
    metadataOptions
  );
  const previewFiles = createMusicDebugInstrumentPreviewWavFiles(snapshot);
  const entries: readonly MusicDebugExportBundleFile[] = [
    midiFile,
    ...previewFiles,
    reportFile,
  ];
  const zipBytes = createStoredZipArchive(
    entries.map((entry) => ({
      fileName: entry.fileName,
      bytes: entry.bytes,
    }))
  );
  const baseName = midiFile.fileName.replace(/\.mid$/i, '');

  return {
    fileName: `${baseName}-export.zip`,
    mimeType: 'application/zip',
    bytes: zipBytes,
    entries,
  };
}

export function downloadMusicDebugExportBundle(
  snapshot: MusicDebugSnapshot,
  environment: MusicDebugExportBundleDownloadEnvironment = createBrowserMusicDebugExportBundleDownloadEnvironment(),
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): void {
  const bundle = createMusicDebugExportBundle(snapshot, metadataOptions);
  const blob = new Blob([new Uint8Array(bundle.bytes).buffer], {
    type: bundle.mimeType,
  });
  const url = environment.createObjectURL(blob);
  const anchor = environment.createAnchor();
  anchor.href = url;
  anchor.download = bundle.fileName;
  environment.appendAnchor(anchor);
  anchor.click();
  anchor.remove();
  environment.revokeObjectURL(url);
}

function createMusicDebugInstrumentPreviewWavFiles(
  snapshot: MusicDebugSnapshot
): readonly MusicDebugPreviewWavFile[] {
  const baseName = formatBundleBaseName(snapshot);
  const roles = ['bass', 'harmony', 'lead', 'percussion'] as const;
  const files: MusicDebugPreviewWavFile[] = [];

  for (const role of roles) {
    const previewNote = resolveMusicDebugInstrumentPreviewNote(
      snapshot,
      role,
      0
    );
    if (!previewNote) {
      continue;
    }
    files.push(
      createMusicDebugPreviewWavFile({
        note: previewNote,
        fileName: `${baseName}-${role}-preview.wav`,
      })
    );
  }

  return files;
}

function createMusicDebugParameterReportFile(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugExportBundleFile {
  const baseName = formatBundleBaseName(snapshot);
  const report = buildMusicDebugParameterReport(snapshot, metadataOptions);

  return {
    fileName: `${baseName}-report.json`,
    mimeType: 'application/json',
    bytes: new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`),
  };
}

function buildMusicDebugParameterReport(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions
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
    midiAudit: snapshot.midiAudit,
    roleCounts: snapshot.roleCounts,
    vocabularySummary: snapshot.vocabularySummary,
    sectionLayerArrangement: snapshot.sectionLayerArrangement,
  };
}

function formatBundleBaseName(snapshot: MusicDebugSnapshot): string {
  return `bworlds-${snapshot.theme.id}-${snapshot.options.clusterX}-${snapshot.options.clusterY}`;
}

function createBrowserMusicDebugExportBundleDownloadEnvironment(): BrowserMusicDebugExportBundleDownloadEnvironment {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement('a'),
    appendAnchor: (anchor) => document.body.appendChild(anchor),
  };
}
