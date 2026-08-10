const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const STORED_COMPRESSION_METHOD = 0;
const textEncoder = new TextEncoder();

export type ZipArchiveEntry = {
  fileName: string;
  bytes: Uint8Array;
};

export function createStoredZipArchive(
  entries: readonly ZipArchiveEntry[]
): Uint8Array {
  const localFileRecords: Uint8Array[] = [];
  const centralDirectoryRecords: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBytes = textEncoder.encode(entry.fileName);
    const crc32 = computeCrc32(entry.bytes);
    const localHeader = createLocalFileHeader({
      fileNameBytes,
      fileSize: entry.bytes.length,
      crc32,
    });
    localFileRecords.push(localHeader, entry.bytes);

    const centralDirectoryHeader = createCentralDirectoryHeader({
      fileNameBytes,
      fileSize: entry.bytes.length,
      crc32,
      localHeaderOffset: offset,
    });
    centralDirectoryRecords.push(centralDirectoryHeader);

    offset += localHeader.length + entry.bytes.length;
  }

  const centralDirectorySize = centralDirectoryRecords.reduce(
    (sum, record) => sum + record.length,
    0
  );
  const endOfCentralDirectory = createEndOfCentralDirectoryRecord({
    entryCount: entries.length,
    centralDirectorySize,
    centralDirectoryOffset: offset,
  });

  return concatUint8Arrays([
    ...localFileRecords,
    ...centralDirectoryRecords,
    endOfCentralDirectory,
  ]);
}

function createLocalFileHeader(options: {
  fileNameBytes: Uint8Array;
  fileSize: number;
  crc32: number;
}): Uint8Array {
  const header = new Uint8Array(30 + options.fileNameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, LOCAL_FILE_HEADER_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, STORED_COMPRESSION_METHOD, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, options.crc32, true);
  view.setUint32(18, options.fileSize, true);
  view.setUint32(22, options.fileSize, true);
  view.setUint16(26, options.fileNameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(options.fileNameBytes, 30);

  return header;
}

function createCentralDirectoryHeader(options: {
  fileNameBytes: Uint8Array;
  fileSize: number;
  crc32: number;
  localHeaderOffset: number;
}): Uint8Array {
  const header = new Uint8Array(46 + options.fileNameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, CENTRAL_DIRECTORY_HEADER_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_VERSION, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, STORED_COMPRESSION_METHOD, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, options.crc32, true);
  view.setUint32(20, options.fileSize, true);
  view.setUint32(24, options.fileSize, true);
  view.setUint16(28, options.fileNameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, options.localHeaderOffset, true);
  header.set(options.fileNameBytes, 46);

  return header;
}

function createEndOfCentralDirectoryRecord(options: {
  entryCount: number;
  centralDirectorySize: number;
  centralDirectoryOffset: number;
}): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);

  view.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, options.entryCount, true);
  view.setUint16(10, options.entryCount, true);
  view.setUint32(12, options.centralDirectorySize, true);
  view.setUint32(16, options.centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return record;
}

function concatUint8Arrays(parts: readonly Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
}

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC32_LOOKUP_TABLE[(crc ^ bytes[index]!) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_LOOKUP_TABLE = createCrc32LookupTable();

function createCrc32LookupTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}
