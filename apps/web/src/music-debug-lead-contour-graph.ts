import type {
  MusicDebugLeadContourAnalysis,
  MusicDebugLeadContourPoint,
} from './music-debug-lead-contour.ts';

const GRAPH_WIDTH = 520;
const GRAPH_HEIGHT = 180;
const GRAPH_PADDING_X = 32;
const GRAPH_PADDING_TOP = 18;
const GRAPH_PADDING_BOTTOM = 34;
const GRAPH_FRAME_FILL = '#08131b';
const GRAPH_FRAME_STROKE = 'rgba(255,255,255,0.08)';
const GRAPH_GUIDE_STROKE = 'rgba(255,255,255,0.12)';
const GRAPH_BAND_FILL = 'rgba(85, 214, 190, 0.18)';
const GRAPH_TARGET_STROKE = '#55d6be';
const GRAPH_ACTUAL_STROKE = '#ffcc33';
const GRAPH_POINT_OK_FILL = '#55d6be';
const GRAPH_POINT_DRIFT_FILL = '#ff8a65';
const GRAPH_POINT_MISSING_FILL = '#9db2bd';
const GRAPH_MEASURE_FILL = '#9db2bd';

export function buildMusicDebugLeadContourGraphSvgMarkup(
  analysis: MusicDebugLeadContourAnalysis
): string {
  if (analysis.points.length === 0) {
    return `
      <svg
        viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}"
        role="img"
        aria-label="Lead contour graph"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0"
          y="0"
          width="${GRAPH_WIDTH}"
          height="${GRAPH_HEIGHT}"
          rx="18"
          ry="18"
          fill="${GRAPH_FRAME_FILL}"
          stroke="${GRAPH_FRAME_STROKE}"
        />
        <text
          x="${GRAPH_WIDTH / 2}"
          y="${GRAPH_HEIGHT / 2 - 8}"
          fill="#d5e3ea"
          font-family="Trebuchet MS, sans-serif"
          font-size="16"
          text-anchor="middle"
        >Lead Contour Graph</text>
        <text
          x="${GRAPH_WIDTH / 2}"
          y="${GRAPH_HEIGHT / 2 + 16}"
          fill="${GRAPH_MEASURE_FILL}"
          font-family="Trebuchet MS, sans-serif"
          font-size="12"
          text-anchor="middle"
        >No lead contour checkpoints were generated.</text>
      </svg>
    `;
  }

  const semitoneRange = resolveSemitoneRange(analysis.points);
  const plannedArea = buildPlannedAreaPoints(analysis.points, semitoneRange);
  const plannedTargetPath = buildGraphPolyline(
    analysis.points.map((point) => ({
      x: resolveGraphX(point, analysis.points),
      y: resolveGraphY(point.plannedTargetSemitones, semitoneRange),
    }))
  );
  const actualPoints = analysis.points.filter(
    (point) => point.actualRelativeSemitones !== null
  );
  const actualPath = buildGraphPolyline(
    actualPoints.map((point) => ({
      x: resolveGraphX(point, analysis.points),
      y: resolveGraphY(point.actualRelativeSemitones ?? 0, semitoneRange),
    }))
  );
  const measureLabels = createMeasureLabels(analysis.points);

  return `
    <svg
      class="music-debug-contour-graph-svg"
      viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}"
      role="img"
      aria-label="Lead contour graph"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        class="music-debug-contour-graph-frame"
        x="0"
        y="0"
        width="${GRAPH_WIDTH}"
        height="${GRAPH_HEIGHT}"
        rx="18"
        ry="18"
        fill="${GRAPH_FRAME_FILL}"
        stroke="${GRAPH_FRAME_STROKE}"
      ></rect>
      ${buildGuideLines(semitoneRange)}
      <polygon
        class="music-debug-contour-graph-band"
        points="${plannedArea}"
        fill="${GRAPH_BAND_FILL}"
      ></polygon>
      <polyline
        class="music-debug-contour-graph-target"
        points="${plannedTargetPath}"
        fill="none"
        stroke="${GRAPH_TARGET_STROKE}"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></polyline>
      ${
        actualPath.length > 0
          ? `<polyline class="music-debug-contour-graph-actual" points="${actualPath}" fill="none" stroke="${GRAPH_ACTUAL_STROKE}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>`
          : ''
      }
      ${analysis.points.map((point) => buildActualPointMarkup(point, analysis.points, semitoneRange)).join('')}
      ${measureLabels}
    </svg>
  `;
}

export function buildMusicDebugLeadContourGraphMarkup(
  analysis: MusicDebugLeadContourAnalysis
): string {
  if (analysis.points.length === 0) {
    return `
      <section class="music-debug-contour-graph" aria-label="Lead contour graph">
        <div class="music-debug-contour-graph-head">
          <h3>Lead Contour Graph</h3>
          <p>Unavailable</p>
        </div>
        <p class="music-debug-contour-graph-empty">No lead contour checkpoints were generated.</p>
      </section>
    `;
  }

  return `
    <section class="music-debug-contour-graph" aria-label="Lead contour graph">
      <div class="music-debug-contour-graph-head">
        <h3>Lead Contour Graph</h3>
        <p>${analysis.inRangePointCount} in range / ${analysis.outOfRangePointCount} drift / ${analysis.missingPointCount} missing</p>
      </div>
      <div class="music-debug-contour-graph-legend" aria-hidden="true">
        <span class="music-debug-contour-legend-band">planned range</span>
        <span class="music-debug-contour-legend-target">planned target</span>
        <span class="music-debug-contour-legend-actual">actual melody</span>
        <span class="music-debug-contour-legend-drift">Drift</span>
        <span class="music-debug-contour-legend-missing">Missing</span>
      </div>
      ${buildMusicDebugLeadContourGraphSvgMarkup(analysis)}
    </section>
  `;
}

function buildGuideLines(range: { min: number; max: number }): string {
  const tickCount = 4;
  const lines: string[] = [];
  for (let index = 0; index <= tickCount; index += 1) {
    const semitones = range.min + ((range.max - range.min) * index) / tickCount;
    const y = resolveGraphY(semitones, range);
    lines.push(
      `<path class="music-debug-contour-graph-guide" d="M${GRAPH_PADDING_X} ${y.toFixed(2)} H${GRAPH_WIDTH - GRAPH_PADDING_X}" fill="none" stroke="${GRAPH_GUIDE_STROKE}" stroke-width="1"></path>`
    );
  }
  return lines.join('');
}

function buildPlannedAreaPoints(
  points: readonly MusicDebugLeadContourPoint[],
  range: { min: number; max: number }
): string {
  const upper = points.map(
    (point) =>
      `${resolveGraphX(point, points).toFixed(2)},${resolveGraphY(point.plannedMaxSemitones, range).toFixed(2)}`
  );
  const lower = [...points]
    .reverse()
    .map(
      (point) =>
        `${resolveGraphX(point, points).toFixed(2)},${resolveGraphY(point.plannedMinSemitones, range).toFixed(2)}`
    );
  return [...upper, ...lower].join(' ');
}

function buildGraphPolyline(
  points: ReadonlyArray<{ x: number; y: number }>
): string {
  return points
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');
}

function buildActualPointMarkup(
  point: MusicDebugLeadContourPoint,
  points: readonly MusicDebugLeadContourPoint[],
  range: { min: number; max: number }
): string {
  const x = resolveGraphX(point, points);
  const y =
    point.actualRelativeSemitones === null
      ? GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM + 6
      : resolveGraphY(point.actualRelativeSemitones, range);
  const stateClass =
    point.actualRelativeSemitones === null
      ? 'music-debug-contour-graph-point-missing'
      : point.withinPlannedRange === false
        ? 'music-debug-contour-graph-point-drift'
        : 'music-debug-contour-graph-point-ok';
  const label =
    point.actualRelativeSemitones === null
      ? `Measure ${point.songMeasure}: missing actual note`
      : `Measure ${point.songMeasure}: planned ${point.plannedTargetSemitones} semitones, actual ${point.actualRelativeSemitones} semitones`;

  return `
    <circle
      class="music-debug-contour-graph-point ${stateClass}"
      cx="${x.toFixed(2)}"
      cy="${y.toFixed(2)}"
      r="4.5"
      fill="${resolvePointFill(stateClass)}"
    >
      <title>${label}</title>
    </circle>
  `;
}

function createMeasureLabels(
  points: readonly MusicDebugLeadContourPoint[]
): string {
  const labels = pickMeasureLabelPoints(points);
  return labels
    .map((point) => {
      const x = resolveGraphX(point, points);
      const y = GRAPH_HEIGHT - 12;
      return `
        <text
          class="music-debug-contour-graph-measure"
          x="${x.toFixed(2)}"
          y="${y}"
          text-anchor="middle"
          fill="${GRAPH_MEASURE_FILL}"
          font-family="Trebuchet MS, sans-serif"
          font-size="11"
        >m${point.songMeasure}</text>
      `;
    })
    .join('');
}

function resolvePointFill(stateClass: string): string {
  switch (stateClass) {
    case 'music-debug-contour-graph-point-missing':
      return GRAPH_POINT_MISSING_FILL;
    case 'music-debug-contour-graph-point-drift':
      return GRAPH_POINT_DRIFT_FILL;
    default:
      return GRAPH_POINT_OK_FILL;
  }
}

function pickMeasureLabelPoints(
  points: readonly MusicDebugLeadContourPoint[]
): MusicDebugLeadContourPoint[] {
  const labelIndexes = new Set([
    0,
    Math.floor((points.length - 1) / 2),
    points.length - 1,
  ]);
  return [...labelIndexes]
    .sort((left, right) => left - right)
    .map((index) => points[index])
    .filter(
      (point): point is MusicDebugLeadContourPoint => point !== undefined
    );
}

function resolveSemitoneRange(points: readonly MusicDebugLeadContourPoint[]): {
  min: number;
  max: number;
} {
  const values = points.flatMap((point) => [
    point.plannedMinSemitones,
    point.plannedMaxSemitones,
    point.plannedTargetSemitones,
    point.actualRelativeSemitones ?? point.plannedTargetSemitones,
  ]);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

function resolveGraphX(
  point: MusicDebugLeadContourPoint,
  points: readonly MusicDebugLeadContourPoint[]
): number {
  if (points.length <= 1) {
    return GRAPH_WIDTH / 2;
  }
  const usableWidth = GRAPH_WIDTH - GRAPH_PADDING_X * 2;
  const index = points.findIndex(
    (entry) => entry.stepIndex === point.stepIndex
  );
  const position = index < 0 ? 0 : index / (points.length - 1);
  return GRAPH_PADDING_X + usableWidth * position;
}

function resolveGraphY(
  semitones: number,
  range: { min: number; max: number }
): number {
  const usableHeight = GRAPH_HEIGHT - GRAPH_PADDING_TOP - GRAPH_PADDING_BOTTOM;
  const normalized =
    (semitones - range.min) / Math.max(1, range.max - range.min);
  return GRAPH_HEIGHT - GRAPH_PADDING_BOTTOM - usableHeight * normalized;
}
