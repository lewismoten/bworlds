import './music-debug.css';
import { createMusicDebugPlaybackController } from './music-debug-playback.ts';
import { downloadMusicDebugMidiFile } from './music-debug-midi.ts';
import {
  buildMusicDebugMarkup,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSongPlayback,
  createMusicDebugSnapshot,
  drawMusicDebugTimeline,
  randomizeMusicDebugSeed,
  type MusicDebugOptions,
} from './music-debug.ts';

const root = document.querySelector<HTMLElement>('#app');
let snapshot = createMusicDebugSnapshot();

if (root) {
  root.innerHTML = buildMusicDebugMarkup(snapshot);
}

const form = document.querySelector<HTMLFormElement>('#music-debug-form');
const summary = document.querySelector<HTMLElement>('#music-debug-summary');
const timeline = document.querySelector<HTMLCanvasElement>(
  '#music-debug-timeline'
);
const playButton =
  document.querySelector<HTMLButtonElement>('#music-debug-play');
const randomizeButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-randomize'
);
const downloadButton = document.querySelector<HTMLButtonElement>(
  '#music-debug-download'
);
const loopInput = document.querySelector<HTMLInputElement>('#music-debug-loop');
const clusterXInput = document.querySelector<HTMLInputElement>(
  'input[name="clusterX"]'
);
const clusterYInput = document.querySelector<HTMLInputElement>(
  'input[name="clusterY"]'
);
const playbackController = createMusicDebugPlaybackController({
  playback: createMusicDebugSongPlayback(),
  onPlayingChange(playing) {
    if (playButton) {
      playButton.textContent = playing ? 'Stop Song' : 'Play Song';
    }
  },
});

function collectOptions(): Partial<MusicDebugOptions> {
  if (!form) {
    return {};
  }
  const data = new FormData(form);
  return {
    tileKind: String(data.get('tileKind') ?? ''),
    contextType: String(data.get('contextType') ?? ''),
    encounterMode: String(data.get('encounterMode') ?? ''),
    weatherKind: String(data.get('weatherKind') ?? ''),
    weatherIntensity: Number(data.get('weatherIntensity') ?? 0),
    dayProgress: Number(data.get('dayProgress') ?? 0),
    yearProgress: Number(data.get('yearProgress') ?? 0),
    clusterX: Number(data.get('clusterX') ?? 0),
    clusterY: Number(data.get('clusterY') ?? 0),
  } as Partial<MusicDebugOptions>;
}

function renderSnapshot(): void {
  snapshot = createMusicDebugSnapshot(
    collectOptions(),
    performance.now() + 120
  );
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
  playbackController.stop();
  renderSnapshot();
});

form?.addEventListener('input', () => {
  playbackController.stop();
  renderSnapshot();
});

playButton?.addEventListener('click', () => {
  if (playbackController.isPlaying()) {
    playbackController.stop();
    return;
  }
  renderSnapshot();
  playbackController.start(snapshot, {
    loop: loopInput?.checked === true,
  });
});

randomizeButton?.addEventListener('click', () => {
  playbackController.stop();
  const randomized = randomizeMusicDebugSeed(collectOptions());
  if (clusterXInput) {
    clusterXInput.value = String(randomized.clusterX);
  }
  if (clusterYInput) {
    clusterYInput.value = String(randomized.clusterY);
  }
  renderSnapshot();
});

downloadButton?.addEventListener('click', () => {
  playbackController.stop();
  renderSnapshot();
  downloadMusicDebugMidiFile(snapshot);
});
