import type { WorldStateLike } from '@bworlds/plugin-api';
import {
  createViewportTileSampler,
  getViewportTileSize,
  render2D,
  type Render2DViewport,
} from '@bworlds/render2d';
import type { DebugSnapshotRecentEvent } from './debug-snapshot.ts';
import type { DebugSnapshot } from './debug-panel.ts';

type Render2DState = Pick<WorldStateLike, 'player' | 'getCurrentTile'> &
  Partial<Pick<WorldStateLike, 'getTileDefinition'>>;

export type MinimapProblemCategory =
  'audio' | 'build' | 'draw' | 'lod' | 'material' | 'quality' | 'scene';

export type MinimapProblemSeverity = 'none' | 'warning' | 'critical';

export type MinimapProblemIssue = {
  category: MinimapProblemCategory;
  severity: Exclude<MinimapProblemSeverity, 'none'>;
  label: string;
  summary: string;
  source: 'event' | 'snapshot';
};

export type MinimapProblemCell = {
  key: string;
  worldX: number;
  worldY: number;
  tileKind: string;
  issueCount: number;
  severity: MinimapProblemSeverity;
  score: number;
  issues: MinimapProblemIssue[];
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

type ProblemIndex = Map<string, MinimapProblemIssue[]>;

const WARNING_COLOR = { red: 245, green: 208, blue: 66 };
const HEALTHY_COLOR = { red: 84, green: 190, blue: 108 };
const CRITICAL_COLOR = { red: 228, green: 79, blue: 79 };

export function parseMinimapProblemTileKey(
  tileKey: string | undefined
): { worldX: number; worldY: number } | null {
  const parts = tileKey?.split(':') ?? [];
  if (parts.length !== 2) {
    return null;
  }
  const worldX = Number.parseInt(parts[0] ?? '', 10);
  const worldY = Number.parseInt(parts[1] ?? '', 10);
  if (!Number.isInteger(worldX) || !Number.isInteger(worldY)) {
    return null;
  }
  return { worldX, worldY };
}

export function buildMinimapProblemCells(
  state: Render2DState,
  viewport: Pick<Render2DViewport, 'width' | 'height' | 'zoom'>,
  options: {
    recentEvents: readonly DebugSnapshotRecentEvent[];
    latestSnapshot: DebugSnapshot | null;
    currentTileX: number;
    currentTileY: number;
  }
): MinimapProblemCell[] {
  const tileAt = createViewportTileSampler(state);
  const tileSize = getViewportTileSize(viewport);
  const diagonal = Math.ceil(
    Math.hypot(viewport.width, viewport.height) / tileSize / 2
  );
  const radiusX = diagonal + 2;
  const radiusY = diagonal + 2;
  const centerX = Math.floor(viewport.width / 2);
  const centerY = Math.floor(viewport.height / 2);
  const anchorX = Math.round(state.player.x);
  const anchorY = Math.round(state.player.y);
  const offsetX = state.player.x - anchorX;
  const offsetY = state.player.y - anchorY;
  const problemIndex = buildMinimapProblemIndex(options);
  const cells: MinimapProblemCell[] = [];

  for (let y = -radiusY; y <= radiusY; y += 1) {
    for (let x = -radiusX; x <= radiusX; x += 1) {
      const worldX = anchorX + x;
      const worldY = anchorY + y;
      const key = `${worldX}:${worldY}`;
      const issues = [...(problemIndex.get(key) ?? [])];
      const issueCount = issues.length;
      const severity =
        issueCount === 0
          ? 'none'
          : issues.some((issue) => issue.severity === 'critical')
            ? 'critical'
            : 'warning';
      const score = issueCount === 0 ? 0 : getProblemScore(issues);
      const drawX =
        centerX + tileSize / 2 + (x - offsetX) * tileSize - tileSize / 2;
      const drawY =
        centerY + tileSize / 2 + (y - offsetY) * tileSize - tileSize / 2;
      cells.push({
        key,
        worldX,
        worldY,
        tileKind: tileAt(worldX, worldY).kind,
        issueCount,
        severity,
        score,
        issues,
        rect: {
          left: drawX,
          top: drawY,
          width: tileSize,
          height: tileSize,
        },
      });
    }
  }

  return cells;
}

export function renderMinimapProblemHeatmap(
  context: CanvasRenderingContext2D,
  state: Render2DState,
  viewport: Render2DViewport,
  options: {
    recentEvents: readonly DebugSnapshotRecentEvent[];
    latestSnapshot: DebugSnapshot | null;
    currentTileX: number;
    currentTileY: number;
  }
): MinimapProblemCell[] {
  context.save();
  context.globalAlpha = 0.22;
  render2D(context, state, {
    ...viewport,
    showTimeOverlay: false,
  });
  context.restore();

  const cells = buildMinimapProblemCells(state, viewport, options);
  context.save();
  for (const cell of cells) {
    context.fillStyle = getMinimapProblemFillStyle(cell.score);
    context.fillRect(
      cell.rect.left,
      cell.rect.top,
      cell.rect.width,
      cell.rect.height
    );
    if (cell.issueCount > 0) {
      context.strokeStyle =
        cell.severity === 'critical'
          ? 'rgba(255, 238, 238, 0.86)'
          : 'rgba(255, 248, 214, 0.84)';
      context.lineWidth = 1.5;
      context.strokeRect(
        cell.rect.left + 0.75,
        cell.rect.top + 0.75,
        Math.max(1, cell.rect.width - 1.5),
        Math.max(1, cell.rect.height - 1.5)
      );
    }
  }
  context.restore();

  return cells;
}

export function getHoveredMinimapProblemCell(
  cells: readonly MinimapProblemCell[],
  canvasX: number,
  canvasY: number
): MinimapProblemCell | null {
  return (
    cells.find(
      (cell) =>
        canvasX >= cell.rect.left &&
        canvasX <= cell.rect.left + cell.rect.width &&
        canvasY >= cell.rect.top &&
        canvasY <= cell.rect.top + cell.rect.height
    ) ?? null
  );
}

export function getMinimapProblemCanvasPoint(
  canvasSize: { width: number; height: number },
  clientSize: { width: number; height: number },
  clientX: number,
  clientY: number
): { canvasX: number; canvasY: number } {
  const scaleX = clientSize.width > 0 ? canvasSize.width / clientSize.width : 1;
  const scaleY =
    clientSize.height > 0 ? canvasSize.height / clientSize.height : 1;
  return {
    canvasX: clientX * scaleX,
    canvasY: clientY * scaleY,
  };
}

export function buildMinimapProblemTooltipMarkup(
  cell: Pick<
    MinimapProblemCell,
    'worldX' | 'worldY' | 'tileKind' | 'severity' | 'issueCount' | 'issues'
  >
): string {
  const issueMarkup =
    cell.issueCount === 0
      ? '<li>No recorded warnings for this tile.</li>'
      : cell.issues
          .slice(0, 4)
          .map(
            (issue) =>
              `<li><strong>${escapeHtml(issue.label)}</strong>: ${escapeHtml(issue.summary)}</li>`
          )
          .join('');
  const remainderCount = Math.max(0, cell.issueCount - 4);
  return `
    <div class="minimap-problem-tooltip-title">${escapeHtml(formatMinimapTileTitle(cell))}</div>
    <div class="minimap-problem-tooltip-meta">
      <span>${escapeHtml(formatMinimapProblemSeverityLabel(cell.severity))}</span>
      <span>${cell.issueCount} issue${cell.issueCount === 1 ? '' : 's'}</span>
    </div>
    <ul class="minimap-problem-tooltip-list">
      ${issueMarkup}
      ${
        remainderCount > 0
          ? `<li>+${remainderCount} more issue${remainderCount === 1 ? '' : 's'}</li>`
          : ''
      }
    </ul>
  `;
}

export function buildMinimapProblemDialogMarkup(
  cell: Pick<
    MinimapProblemCell,
    'worldX' | 'worldY' | 'tileKind' | 'severity' | 'issueCount' | 'issues'
  >
): string {
  return `
    <div class="minimap-problem-dialog-summary">
      <div><dt>Tile</dt><dd>${escapeHtml(formatMinimapTileTitle(cell))}</dd></div>
      <div><dt>Severity</dt><dd>${escapeHtml(formatMinimapProblemSeverityLabel(cell.severity))}</dd></div>
      <div><dt>Issue Count</dt><dd>${cell.issueCount}</dd></div>
    </div>
    <div class="minimap-problem-dialog-issues">
      ${
        cell.issueCount === 0
          ? '<p>No active warnings are attached to this tile right now.</p>'
          : `<ul>${cell.issues
              .map(
                (issue) =>
                  `<li><strong>${escapeHtml(issue.label)}</strong><span>${escapeHtml(issue.summary)}</span></li>`
              )
              .join('')}</ul>`
      }
    </div>
  `;
}

export function formatMinimapProblemSeverityLabel(
  severity: MinimapProblemSeverity
): string {
  if (severity === 'critical') {
    return 'Critical';
  }
  if (severity === 'warning') {
    return 'Warning';
  }
  return 'Healthy';
}

function buildMinimapProblemIndex(options: {
  recentEvents: readonly DebugSnapshotRecentEvent[];
  latestSnapshot: DebugSnapshot | null;
  currentTileX: number;
  currentTileY: number;
}): ProblemIndex {
  const index = new Map<string, MinimapProblemIssue[]>();

  for (const event of options.recentEvents) {
    const position = parseMinimapProblemTileKey(event.tileKey);
    if (!position) {
      continue;
    }
    const issue = toEventProblemIssue(event);
    if (!issue) {
      continue;
    }
    appendProblemIssue(index, `${position.worldX}:${position.worldY}`, issue);
  }

  const currentTileKey = `${options.currentTileX}:${options.currentTileY}`;
  for (const issue of getSnapshotProblemIssues(options.latestSnapshot)) {
    appendProblemIssue(index, currentTileKey, issue);
  }

  return index;
}

function appendProblemIssue(
  index: ProblemIndex,
  key: string,
  issue: MinimapProblemIssue
): void {
  const issues = index.get(key) ?? [];
  if (
    issues.some(
      (existing) =>
        existing.category === issue.category &&
        existing.summary === issue.summary &&
        existing.label === issue.label
    )
  ) {
    return;
  }
  issues.push(issue);
  index.set(key, issues);
}

function toEventProblemIssue(
  event: DebugSnapshotRecentEvent
): MinimapProblemIssue | null {
  const summary = event.summary?.trim();
  if (!summary) {
    return null;
  }
  const category = classifyMinimapProblemCategory(summary, event.type);
  const severity = resolveMinimapEventSeverity(event.type, summary);
  return {
    category,
    severity,
    label: formatMinimapProblemLabel(category),
    summary,
    source: 'event',
  };
}

function getSnapshotProblemIssues(
  snapshot: DebugSnapshot | null
): MinimapProblemIssue[] {
  if (!snapshot) {
    return [];
  }

  const issues: MinimapProblemIssue[] = [];
  const qualitySummary = snapshot.renderQualityLimiters?.trim();
  if (qualitySummary && qualitySummary !== 'None') {
    issues.push({
      category: 'quality',
      severity:
        snapshot.performanceTier === 'critical' ? 'critical' : 'warning',
      label: 'Graphics quality',
      summary: qualitySummary,
      source: 'snapshot',
    });
  }

  const currentTileFallback = snapshot.currentTileFallbackReason?.trim();
  if (currentTileFallback) {
    issues.push({
      category: 'lod',
      severity: 'warning',
      label: 'Fallback',
      summary: currentTileFallback,
      source: 'snapshot',
    });
  }

  const currentTileLodReason = snapshot.lastLodFailureReason?.trim();
  if (currentTileLodReason) {
    issues.push({
      category: 'lod',
      severity: 'critical',
      label: 'LOD failure',
      summary: currentTileLodReason,
      source: 'snapshot',
    });
  }

  for (const warning of snapshot.resourceWarnings ?? []) {
    const trimmed = warning.trim();
    if (!trimmed) {
      continue;
    }
    const category = classifyMinimapProblemCategory(trimmed);
    const severity: Exclude<MinimapProblemSeverity, 'none'> =
      trimmed.toLowerCase().includes('over budget') ||
      trimmed.toLowerCase().includes('exceed') ||
      trimmed.toLowerCase().includes('backing up')
        ? 'critical'
        : 'warning';
    issues.push({
      category,
      severity,
      label: formatMinimapProblemLabel(category),
      summary: trimmed,
      source: 'snapshot',
    });
  }

  return issues;
}

function classifyMinimapProblemCategory(
  summary: string,
  type?: DebugSnapshotRecentEvent['type']
): MinimapProblemCategory {
  const normalized = summary.toLowerCase();
  if (
    type === 'fallback-box' ||
    type === 'lod-changed' ||
    normalized.includes('lod') ||
    normalized.includes('fallback') ||
    normalized.includes('detail level')
  ) {
    return 'lod';
  }
  if (
    normalized.includes('audio') ||
    normalized.includes('sound') ||
    normalized.includes('music')
  ) {
    return 'audio';
  }
  if (
    normalized.includes('material') ||
    normalized.includes('texture') ||
    normalized.includes('shader')
  ) {
    return 'material';
  }
  if (
    normalized.includes('draw') ||
    normalized.includes('triangle') ||
    normalized.includes('mesh')
  ) {
    return 'draw';
  }
  if (
    normalized.includes('queue') ||
    normalized.includes('pending') ||
    normalized.includes('build')
  ) {
    return 'build';
  }
  if (
    normalized.includes('object') ||
    normalized.includes('matrix') ||
    normalized.includes('group')
  ) {
    return 'scene';
  }
  return 'quality';
}

function resolveMinimapEventSeverity(
  type: DebugSnapshotRecentEvent['type'],
  summary: string
): Exclude<MinimapProblemSeverity, 'none'> {
  if (type === 'model-rejected' || type === 'plugin-exceeded-budget') {
    return 'critical';
  }
  if (type === 'fallback-box') {
    return 'warning';
  }
  if (summary.toLowerCase().includes('hard cap')) {
    return 'critical';
  }
  return 'warning';
}

function formatMinimapProblemLabel(category: MinimapProblemCategory): string {
  switch (category) {
    case 'audio':
      return 'Audio';
    case 'build':
      return 'Build queue';
    case 'draw':
      return 'Render load';
    case 'lod':
      return 'LOD';
    case 'material':
      return 'Materials';
    case 'scene':
      return 'Scene graph';
    default:
      return 'Quality';
  }
}

function getProblemScore(issues: readonly MinimapProblemIssue[]): number {
  const totalWeight = issues.reduce(
    (sum, issue) => sum + (issue.severity === 'critical' ? 2 : 1),
    0
  );
  return Math.max(0.24, Math.min(1, totalWeight / 4));
}

function getMinimapProblemFillStyle(score: number): string {
  if (score <= 0) {
    return 'rgba(84, 190, 108, 0.18)';
  }
  if (score < 0.5) {
    return toRgba(
      mixColor(HEALTHY_COLOR, WARNING_COLOR, score / 0.5),
      0.28 + score * 0.28
    );
  }
  return toRgba(
    mixColor(WARNING_COLOR, CRITICAL_COLOR, (score - 0.5) / 0.5),
    0.46 + Math.min(0.28, score * 0.24)
  );
}

function mixColor(
  start: { red: number; green: number; blue: number },
  end: { red: number; green: number; blue: number },
  amount: number
): { red: number; green: number; blue: number } {
  return {
    red: Math.round(start.red + (end.red - start.red) * amount),
    green: Math.round(start.green + (end.green - start.green) * amount),
    blue: Math.round(start.blue + (end.blue - start.blue) * amount),
  };
}

function toRgba(
  color: { red: number; green: number; blue: number },
  alpha: number
): string {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha.toFixed(3)})`;
}

function formatMinimapTileTitle(
  cell: Pick<MinimapProblemCell, 'worldX' | 'worldY' | 'tileKind'>
): string {
  return `${cell.tileKind} @ ${cell.worldX}:${cell.worldY}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
