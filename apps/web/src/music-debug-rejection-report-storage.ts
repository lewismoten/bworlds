import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  buildMusicDebugParameterReport,
  collectMusicDebugRejectedReportReasons,
  type MusicDebugParameterReport,
  type MusicDebugReportMetadataOptions,
} from './music-debug-report.ts';

const MUSIC_DEBUG_REJECTION_REPORTS_STORAGE_KEY =
  'bworlds:music-debug-rejection-reports';
const MUSIC_DEBUG_REJECTION_REPORT_LIMIT = 12;

export type MusicDebugRejectedReportRecord = {
  id: string;
  savedAt: string;
  themeId: string;
  clusterX: number;
  clusterY: number;
  rejectionReasons: string[];
  report: MusicDebugParameterReport;
};

type MusicDebugRejectionReportStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function saveRejectedMusicDebugReport(
  snapshot: MusicDebugSnapshot,
  storage: MusicDebugRejectionReportStorage | null,
  metadataOptions: MusicDebugReportMetadataOptions = {}
): MusicDebugRejectedReportRecord | null {
  if (!storage) {
    return null;
  }
  const rejectionReasons = collectMusicDebugRejectedReportReasons(snapshot);
  if (rejectionReasons.length === 0) {
    return null;
  }

  const savedAt = (metadataOptions.createdAt ?? new Date()).toISOString();
  const record: MusicDebugRejectedReportRecord = {
    id: `${snapshot.theme.id}:${snapshot.options.clusterX}:${snapshot.options.clusterY}:${savedAt}`,
    savedAt,
    themeId: snapshot.theme.id,
    clusterX: snapshot.options.clusterX,
    clusterY: snapshot.options.clusterY,
    rejectionReasons,
    report: buildMusicDebugParameterReport(snapshot, metadataOptions),
  };
  const existing = loadRejectedMusicDebugReports(storage);
  const latest = existing[0];
  const signature = `${snapshot.theme.id}:${snapshot.options.clusterX}:${snapshot.options.clusterY}:${rejectionReasons.join('|')}`;
  const latestSignature =
    latest &&
    `${latest.themeId}:${latest.clusterX}:${latest.clusterY}:${latest.rejectionReasons.join('|')}`;
  if (signature === latestSignature) {
    return latest;
  }
  storage.setItem(
    MUSIC_DEBUG_REJECTION_REPORTS_STORAGE_KEY,
    JSON.stringify(
      [record, ...existing].slice(0, MUSIC_DEBUG_REJECTION_REPORT_LIMIT)
    )
  );
  return record;
}

export function loadRejectedMusicDebugReports(
  storage: MusicDebugRejectionReportStorage | null
): MusicDebugRejectedReportRecord[] {
  if (!storage) {
    return [];
  }
  const raw = storage.getItem(MUSIC_DEBUG_REJECTION_REPORTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as MusicDebugRejectedReportRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
