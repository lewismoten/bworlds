import { describe, expect, it } from 'vitest';

import { readRecentRuntimePerformanceIssues } from '../runtime-performance-snapshot-store.mjs';

describe('latest runtime performance issues', () => {
  it('fails when local runtime performance issue reports still exist on disk', () => {
    const issues = readRecentRuntimePerformanceIssues({ limit: 50 });
    if (issues.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const details = issues
      .map(
        (issue) =>
          [
            `${issue.createdAt} | ${issue.summary}`,
            ...issue.reasons,
            formatRuntimeIssueHotspot(
              'Instancing-warning hotspots',
              issue.pluginHotspots.instancingWarnings
            ),
            formatRuntimeIssueHotspot(
              'Material hotspots',
              issue.pluginHotspots.materials
            ),
            formatRuntimeIssueHotspot(
              'Draw-call hotspots',
              issue.pluginHotspots.drawCalls
            ),
            formatRuntimeIssueHotspot(
              'Object hotspots',
              issue.pluginHotspots.objects
            ),
            formatRuntimeIssueHotspot(
              'Mesh hotspots',
              issue.pluginHotspots.meshes
            ),
            formatRuntimeIssueHotspot(
              'LOD-swap hotspots',
              issue.pluginHotspots.lodSwaps
            ),
            formatRuntimeIssueHotspot(
              'Fallback hotspots',
              issue.pluginHotspots.fallbackBoxes
            ),
            formatRuntimeIssueHotspot(
              'Rejected-model hotspots',
              issue.pluginHotspots.rejectedModels
            ),
            formatRuntimeIssueHotspot(
              'Static-matrix hotspots',
              issue.pluginHotspots.staticMatrixUpdates
            ),
            formatRuntimeIssueField(
              'Current tile',
              issue.currentTile.plugin
                ? `${issue.currentTile.plugin} (${issue.currentTile.requestedDetailLevel ?? 'unknown'} -> ${issue.currentTile.renderedDetailLevel ?? 'unknown'})`
                : null
            ),
            formatRuntimeIssueField(
              'Latest quality change',
              issue.renderState.latestQualityChangeSummary
            ),
          ]
            .filter((line): line is string => Boolean(line))
            .join('\n')
      )
      .join('\n\n');
    throw new Error(
      `Found saved runtime performance issue reports. Investigate the runtime regressions and remove the resolved issue files from disk.\n\n${details}`
    );
  });
});

function formatRuntimeIssueHotspot(
  label: string,
  value: string | null | undefined
): string | null {
  return formatRuntimeIssueField(label, value);
}

function formatRuntimeIssueField(
  label: string,
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return `${label}: ${trimmed}`;
}
