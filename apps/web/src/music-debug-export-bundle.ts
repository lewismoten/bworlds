import type { MusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugInstrumentPreviewNote } from './music-debug-instrument-panel.ts';
import { createMusicDebugMidiFile } from './music-debug-midi-file.ts';
import { type MusicDebugMidiMetadataOptions } from './music-debug-midi.ts';
import { buildMusicDebugParameterReport } from './music-debug-report.ts';
import { createMusicDebugGraphExportFiles } from './music-debug-export-graphs.ts';
import {
  createMusicDebugPreviewWavFileForNotes,
  createMusicDebugPreviewWavFile,
  type MusicDebugPreviewWavFile,
} from './music-debug-preview-wav.ts';
import { createMusicDebugPercussionVoiceCounts } from './music-debug-percussion-report.ts';
import { createStoredZipArchive } from './zip-file.ts';

export type MusicDebugExportBundleFile = {
  fileName: string;
  bytes: Uint8Array;
  mimeType: string;
};

export type MusicDebugExportBundle = MusicDebugExportBundleFile & {
  entries: readonly MusicDebugExportBundleFile[];
};

export type MusicDebugExportBundleMetrics = {
  midiExportMs: number;
  wavExportMs: number;
  totalExportMs: number;
  previewWavFileCount: number;
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
  return createMeasuredMusicDebugExportBundle(snapshot, metadataOptions).bundle;
}

export function createMeasuredMusicDebugExportBundle(
  snapshot: MusicDebugSnapshot,
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): {
  bundle: MusicDebugExportBundle;
  metrics: MusicDebugExportBundleMetrics;
} {
  const totalStartedAtMs = performance.now();
  const midiStartedAtMs = performance.now();
  const midiFile = createMusicDebugMidiFile(snapshot, metadataOptions);
  const midiExportMs = performance.now() - midiStartedAtMs;
  const reportFile = createMusicDebugParameterReportFile(
    snapshot,
    metadataOptions
  );
  const graphFiles = createMusicDebugGraphExportFiles(
    snapshot,
    formatBundleBaseName(snapshot)
  );
  const wavStartedAtMs = performance.now();
  const previewFiles = createMusicDebugInstrumentPreviewWavFiles(snapshot);
  const wavExportMs = performance.now() - wavStartedAtMs;
  const entries: readonly MusicDebugExportBundleFile[] = [
    midiFile,
    ...graphFiles,
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
    bundle: {
      fileName: `${baseName}-export.zip`,
      mimeType: 'application/zip',
      bytes: zipBytes,
      entries,
    },
    metrics: {
      midiExportMs,
      wavExportMs,
      totalExportMs: performance.now() - totalStartedAtMs,
      previewWavFileCount: previewFiles.length,
    },
  };
}

export function downloadMusicDebugExportBundle(
  snapshot: MusicDebugSnapshot,
  environment: MusicDebugExportBundleDownloadEnvironment = createBrowserMusicDebugExportBundleDownloadEnvironment(),
  metadataOptions: MusicDebugMidiMetadataOptions = {}
): MusicDebugExportBundleMetrics {
  const { bundle, metrics } = createMeasuredMusicDebugExportBundle(
    snapshot,
    metadataOptions
  );
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
  return metrics;
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

  for (const voiceCount of createMusicDebugPercussionVoiceCounts(
    snapshot.notes
  )) {
    const soloNotes = snapshot.notes.filter(
      (note) =>
        note.role === 'percussion' &&
        voiceCount.voiceId !== null &&
        note.instrumentId.includes(`perc-${voiceCount.voiceId}:`)
    );
    if (soloNotes.length === 0) {
      continue;
    }
    files.push(
      createMusicDebugPreviewWavFileForNotes({
        notes: soloNotes,
        fileName: `${baseName}-percussion-${voiceCount.voiceId}-solo.wav`,
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
