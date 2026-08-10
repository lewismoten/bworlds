import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMeasuredMusicDebugExportBundle,
  createMusicDebugExportBundle,
  downloadMusicDebugExportBundle,
} from './music-debug-export-bundle.ts';
import { createMusicDebugPercussionVoiceCounts } from './music-debug-percussion-report.ts';

describe('music debug export bundle', () => {
  it('packages midi, preview wavs, and a parameter report into one zip file', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 4,
        clusterY: -1,
      })
    );

    const bundle = createMusicDebugExportBundle(snapshot, {
      variant: 'melody-only',
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });
    const archiveEntries = readStoredZipArchiveEntries(bundle.bytes);
    const fileNames = archiveEntries.map((entry) => entry.fileName);
    const reportEntry = archiveEntries.find((entry) =>
      entry.fileName.endsWith('-report.json')
    );
    const percussionVoices = createMusicDebugPercussionVoiceCounts(
      snapshot.notes
    );

    expect(bundle.fileName).toBe('bworlds-deep-forest-4--1-melody-export.zip');
    expect(bundle.mimeType).toBe('application/zip');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-melody.mid');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-bass-preview.wav');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-harmony-preview.wav');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-lead-preview.wav');
    expect(fileNames).toContain(
      'bworlds-deep-forest-4--1-percussion-preview.wav'
    );
    expect(fileNames).toContain('bworlds-deep-forest-4--1-report.json');
    for (const voice of percussionVoices) {
      expect(fileNames).toContain(
        `bworlds-deep-forest-4--1-percussion-${voice.voiceId}-solo.wav`
      );
    }
    expect(bundle.entries).toHaveLength(6 + percussionVoices.length);
    expect(reportEntry).toBeDefined();
    expect(
      JSON.parse(
        new TextDecoder().decode(reportEntry?.bytes ?? new Uint8Array())
      )
    ).toEqual(
      expect.objectContaining({
        exportVariant: 'melody-only',
        options: expect.objectContaining({
          clusterX: 4,
          clusterY: -1,
        }),
        song: expect.objectContaining({
          leadContourAnalysis: expect.objectContaining({
            points: expect.any(Array),
            inRangePointCount: expect.any(Number),
            outOfRangePointCount: expect.any(Number),
            finalResolvesToTonic: expect.any(Boolean),
          }),
        }),
        percussion: expect.objectContaining({
          voiceCounts: expect.any(Array),
          events: expect.any(Array),
        }),
      })
    );
  });

  it('downloads the bundled zip through a blob url', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      })
    );
    const remove = vi.fn();
    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
      remove,
    };
    const appendAnchor = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:bundle');
    const revokeObjectURL = vi.fn();

    downloadMusicDebugExportBundle(
      snapshot,
      {
        createObjectURL,
        revokeObjectURL,
        createAnchor: () => anchor,
        appendAnchor,
      },
      {
        createdAt: new Date('2026-08-10T00:00:00.000Z'),
      }
    );

    expect(anchor.href).toBe('blob:bundle');
    expect(anchor.download).toBe('bworlds-town-square-3--2-export.zip');
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(appendAnchor).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:bundle');
  }, 10_000);

  it('reports export timing metrics for midi and preview wav generation', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 1,
        clusterY: 2,
      })
    );

    const measured = createMeasuredMusicDebugExportBundle(snapshot, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    expect(measured.bundle.fileName).toContain('-export.zip');
    expect(measured.metrics).toEqual(
      expect.objectContaining({
        midiExportMs: expect.any(Number),
        wavExportMs: expect.any(Number),
        totalExportMs: expect.any(Number),
        previewWavFileCount: expect.any(Number),
      })
    );
    expect(measured.metrics.previewWavFileCount).toBeGreaterThan(0);
  });
});

function readStoredZipArchiveEntries(archive: Uint8Array) {
  const view = new DataView(
    archive.buffer,
    archive.byteOffset,
    archive.byteLength
  );
  const decoder = new TextDecoder();
  const entries: Array<{ fileName: string; bytes: Uint8Array }> = [];
  let offset = 0;

  while (offset + 4 <= archive.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      break;
    }
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraFieldLength = view.getUint16(offset + 28, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    const fileDataStart = fileNameEnd + extraFieldLength;
    const fileDataEnd = fileDataStart + compressedSize;

    entries.push({
      fileName: decoder.decode(archive.slice(fileNameStart, fileNameEnd)),
      bytes: archive.slice(fileDataStart, fileDataEnd),
    });
    offset = fileDataEnd;
  }

  return entries;
}

function toExportableSnapshot(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return withValidPercussionValidation(
    withValidLeadContourAnalysis(
      withValidProgressionDetections(withValidCadenceValidation(snapshot))
    )
  );
}

function withValidCadenceValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    cadenceValidation: {
      ...snapshot.cadenceValidation,
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

function withValidLeadContourAnalysis(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    leadContourAnalysis: {
      ...snapshot.leadContourAnalysis,
      finalResolvesToTonic: true,
      climaxNearPlannedPeak: true,
      matchesPlannedContour: true,
      messages: snapshot.leadContourAnalysis.messages.filter(
        (message) =>
          !message.includes('climax peaked at') &&
          !message.includes('resolved to scale degree')
      ),
    },
  };
}

function withValidPercussionValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    percussionValidation: {
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

function withValidProgressionDetections(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    harmonyChordDetections: snapshot.harmonyChordDetections.map((section) => ({
      ...section,
      followsPlannedProgression: true,
      driftWindows: [],
    })),
    bassProgressionDetections: snapshot.bassProgressionDetections.map(
      (section) => ({
        ...section,
        followsPlannedProgression: true,
        driftWindows: [],
      })
    ),
  };
}
