import type {
  MusicDebugLeadContourAnalysis,
  MusicDebugLeadContourPoint,
} from './music-debug-lead-contour.ts';

const GRAPH_WIDTH = 520;
const GRAPH_HEIGHT = 180;
const GRAPH_PADDING_X = 32;
const GRAPH_PADDING_TOP = 18;
const GRAPH_PADDING_BOTTOM = 34;

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
    <section class="music-debug-contour-graph" aria-label="Lead contour graph">
      <div class="music-debug-contour-graph-head">
        <h3>Lead Contour Graph</h3>
        <p>${analysis.inRangePointCount} in range / ${analysis.outOfRangePointCount} drift / ${analysis.missingPointCount} missing</p>
      </div>
      <div class="music-debug-contour-graph-legend" aria-hidden="true">
        <span class="music-debug-contour-legend-band">planned range</span>
        <span class="music-debug-contour-legend-target">planned target</span>
        <span class="music-debug-contour-legend-actual">actual melody</span>
      </div>
      <svg
        class="music-debug-contour-graph-svg"
        viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}"
        role="img"
        aria-label="Lead contour graph"
      >
        <rect
          class="music-debug-contour-graph-frame"
          x="0"
          y="0"
          width="${GRAPH_WIDTH}"
          height="${GRAPH_HEIGHT}"
          rx="18"
          ry="18"
        ></rect>
        ${buildGuideLines(semitoneRange)}
        <polygon
          class="music-debug-contour-graph-band"
          points="${plannedArea}"
        ></polygon>
        <polyline
          class="music-debug-contour-graph-target"
          points="${plannedTargetPath}"
        ></polyline>
        ${
          actualPath.length > 0
            ? `<polyline class="music-debug-contour-graph-actual" points="${actualPath}"></polyline>`
            : ''
        }
        ${analysis.points.map((point) => buildActualPointMarkup(point, analysis.points, semitoneRange)).join('')}
        ${measureLabels}
      </svg>
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
      `<path class="music-debug-contour-graph-guide" d="M${GRAPH_PADDING_X} ${y.toFixed(2)} H${GRAPH_WIDTH - GRAPH_PADDING_X}"></path>`
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
        >m${point.songMeasure}</text>
      `;
    })
    .join('');
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
