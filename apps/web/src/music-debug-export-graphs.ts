import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugInstrumentCardExports,
  buildMusicDebugInstrumentWaveformSvgMarkup,
} from './music-debug-instrument-panel.ts';
import { buildMusicDebugLeadContourGraphSvgMarkup } from './music-debug-lead-contour-graph.ts';
import { buildMusicDebugTimelineSvgMarkup } from './music-debug-timeline.ts';

export type MusicDebugGraphExportFile = {
  fileName: string;
  bytes: Uint8Array;
  mimeType: 'image/svg+xml';
};

type MusicDebugGraphMarkupFile = {
  fileName: string;
  markup: string;
  mimeType: 'image/svg+xml';
};

export function createMusicDebugGraphExportFiles(
  snapshot: MusicDebugSnapshot,
  baseName: string
): readonly MusicDebugGraphExportFile[] {
  const encoder = new TextEncoder();
  const files: MusicDebugGraphMarkupFile[] = [
    createGraphFile(
      `${baseName}-timeline.svg`,
      buildMusicDebugTimelineSvgMarkup(snapshot)
    ),
    createGraphFile(
      `${baseName}-lead-contour.svg`,
      buildMusicDebugLeadContourGraphSvgMarkup(snapshot.leadContourAnalysis)
    ),
  ];

  for (const card of createMusicDebugInstrumentCardExports(snapshot)) {
    files.push(
      createGraphFile(
        `${baseName}-${card.fileSuffix}.svg`,
        buildMusicDebugInstrumentWaveformSvgMarkup(card.audioSource)
      )
    );
  }

  return files.map((file) => ({
    fileName: file.fileName,
    mimeType: file.mimeType,
    bytes: encoder.encode(`${file.markup}\n`),
  }));
}

function createGraphFile(
  fileName: string,
  markup: string
): MusicDebugGraphMarkupFile {
  return {
    fileName,
    mimeType: 'image/svg+xml' as const,
    markup,
  };
}
