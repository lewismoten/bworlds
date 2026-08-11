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
