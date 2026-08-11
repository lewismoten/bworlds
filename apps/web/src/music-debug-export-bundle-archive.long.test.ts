import { describe, expect, it } from 'vitest';

import { createMusicDebugExportBundle } from './music-debug-export-bundle.ts';
import {
  FOREST_EXPORTABLE_SNAPSHOT,
  FOREST_PERCUSSION_VOICES,
} from './testing/music-debug-export-bundle-fixtures.ts';
import { readStoredZipArchiveEntries } from './testing/music-debug-export-bundle-test-support.ts';

describe('music debug export bundle archive', () => {
  it('packages midi, preview wavs, and a parameter report into one zip file', () => {
    const snapshot = FOREST_EXPORTABLE_SNAPSHOT;
    const bundle = createMusicDebugExportBundle(snapshot, {
      variant: 'melody-only',
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });
    const archiveEntries = readStoredZipArchiveEntries(bundle.bytes);
    const fileNames = archiveEntries.map((entry) => entry.fileName);
    const reportEntry = archiveEntries.find((entry) =>
      entry.fileName.endsWith('-report.json')
    );
    const percussionVoices = FOREST_PERCUSSION_VOICES;

    expect(bundle.fileName).toBe('bworlds-deep-forest-4--1-melody-export.zip');
    expect(bundle.mimeType).toBe('application/zip');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-melody.mid');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-timeline.svg');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-lead-contour.svg');
    expect(fileNames).toContain('bworlds-deep-forest-4--1-bass-waveform.svg');
    expect(fileNames).toContain(
      'bworlds-deep-forest-4--1-harmony-waveform.svg'
    );
    expect(fileNames).toContain('bworlds-deep-forest-4--1-lead-waveform.svg');
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
      expect(fileNames).toContain(
        `bworlds-deep-forest-4--1-percussion-${voice.voiceId}-waveform.svg`
      );
    }
    expect(bundle.entries).toHaveLength(11 + percussionVoices.length * 2);
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
    expect(
      new TextDecoder().decode(
        archiveEntries.find((entry) => entry.fileName.endsWith('-timeline.svg'))
          ?.bytes ?? new Uint8Array()
      )
    ).toContain('aria-label="Music debug timeline"');
    expect(
      new TextDecoder().decode(
        archiveEntries.find((entry) =>
          entry.fileName.endsWith('-lead-contour.svg')
        )?.bytes ?? new Uint8Array()
      )
    ).toContain('Lead contour graph');
  }, 3_000);
});
