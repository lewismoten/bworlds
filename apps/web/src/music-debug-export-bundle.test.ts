import { describe, expect, it, vi } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugExportBundle,
  downloadMusicDebugExportBundle,
} from './music-debug-export-bundle.ts';

describe('music debug export bundle', () => {
  it('packages midi, preview wavs, and a parameter report into one zip file', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });

    const bundle = createMusicDebugExportBundle(snapshot, {
      variant: 'melody-only',
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });
    const archiveEntries = readStoredZipArchiveEntries(bundle.bytes);
    const fileNames = archiveEntries.map((entry) => entry.fileName);
    const reportEntry = archiveEntries.find((entry) =>
      entry.fileName.endsWith('-report.json')
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
    expect(bundle.entries).toHaveLength(6);
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
      })
    );
  });

  it('downloads the bundled zip through a blob url', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
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
