import './music-debug.css';
import {
  buildMusicDebugMarkup,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSnapshot,
  drawMusicDebugTimeline,
  playMusicDebugPreview,
  type MusicDebugOptions,
} from './music-debug.ts';

const root = document.querySelector<HTMLElement>('#app');
let snapshot = createMusicDebugSnapshot();

if (root) {
  root.innerHTML = buildMusicDebugMarkup(snapshot);
}

const form = document.querySelector<HTMLFormElement>('#music-debug-form');
const summary = document.querySelector<HTMLElement>('#music-debug-summary');
const timeline = document.querySelector<HTMLCanvasElement>('#music-debug-timeline');
const playButton = document.querySelector<HTMLButtonElement>('#music-debug-play');

function collectOptions(): Partial<MusicDebugOptions> {
  if (!form) {
    return {};
  }
  const data = new FormData(form);
  return {
    tileKind: String(data.get('tileKind') ?? ''),
    contextType: String(data.get('contextType') ?? ''),
    weatherKind: String(data.get('weatherKind') ?? ''),
    weatherIntensity: Number(data.get('weatherIntensity') ?? 0),
    dayProgress: Number(data.get('dayProgress') ?? 0),
    yearProgress: Number(data.get('yearProgress') ?? 0),
    clusterX: Number(data.get('clusterX') ?? 0),
    clusterY: Number(data.get('clusterY') ?? 0),
  } as Partial<MusicDebugOptions>;
}

function renderSnapshot(): void {
  snapshot = createMusicDebugSnapshot(collectOptions(), performance.now() + 120);
  if (summary) {
    summary.innerHTML = buildMusicDebugSummaryMarkup(snapshot);
  }
  if (timeline) {
    drawMusicDebugTimeline(timeline, snapshot);
  }
}

if (summary && timeline) {
  summary.innerHTML = buildMusicDebugSummaryMarkup(snapshot);
  drawMusicDebugTimeline(timeline, snapshot);
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  renderSnapshot();
});

form?.addEventListener('input', () => {
  renderSnapshot();
});

playButton?.addEventListener('click', () => {
  renderSnapshot();
  playMusicDebugPreview(snapshot);
});
