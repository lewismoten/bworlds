import { describe, expect, it } from 'vitest';
import { createStoredZipArchive } from './zip-file.ts';

describe('zip file', () => {
  it('creates a stored zip archive with retrievable file entries', () => {
    const archive = createStoredZipArchive([
      {
        fileName: 'alpha.txt',
        bytes: new TextEncoder().encode('hello'),
      },
      {
        fileName: 'nested/bravo.json',
        bytes: new TextEncoder().encode('{"ok":true}'),
      },
    ]);
    const entries = readStoredZipArchiveEntries(archive);

    expect(entries.map((entry) => entry.fileName)).toEqual([
      'alpha.txt',
      'nested/bravo.json',
    ]);
    expect(new TextDecoder().decode(entries[0]!.bytes)).toBe('hello');
    expect(new TextDecoder().decode(entries[1]!.bytes)).toBe('{"ok":true}');
  });
});

export function readStoredZipArchiveEntries(archive: Uint8Array) {
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
