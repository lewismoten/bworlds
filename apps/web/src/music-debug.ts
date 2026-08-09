import {
  createProceduralInstrumentBank,
  type MusicSink,
  createWebAudioMusicSink,
  resolveMusicArrangement,
  resolveMusicMood,
  resolveMusicTheme,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import {
  isProceduralSemitoneInScale,
  resolveProceduralChordProgression,
  resolveProceduralLeadMotif,
  resolveProceduralLeadPhraseCadence,
} from './procedural-music-harmony.ts';
import {
  createProceduralMusicSong,
  type ProceduralMusicSong,
} from './procedural-music-song.ts';
import { randomizeDebugCoordinatePair } from './debug-seed.ts';
import { createMusicDebugScaleOverlay } from './music-debug-scale.ts';

export type MusicDebugTileKind =
  'plains' | 'forest' | 'shore' | 'town' | 'mountain' | 'cave' | 'floor';
export type MusicDebugContextType =
  'overworld' | 'town' | 'building' | 'cave' | 'dungeon';
export type MusicDebugWeatherKind =
  'clear' | 'fog' | 'light-rain' | 'heavy-rain';

export type MusicDebugOptions = {
  tileKind: MusicDebugTileKind;
  contextType: MusicDebugContextType;
  weatherKind: MusicDebugWeatherKind;
  weatherIntensity: number;
  dayProgress: number;
  yearProgress: number;
  clusterX: number;
  clusterY: number;
};

export type MusicDebugSnapshot = {
  options: MusicDebugOptions;
  theme: ReturnType<typeof resolveMusicTheme>;
  mood: ReturnType<typeof resolveMusicMood>;
  arrangement: ReturnType<typeof resolveMusicArrangement>;
  instrumentBank: ReturnType<typeof createProceduralInstrumentBank>;
  chordProgression: number[];
  leadMotif: number[];
  leadPhraseCadence: string[];
  song: ProceduralMusicSong;
  notes: ProceduralMusicNote[];
  durationMs: number;
  loopStartOffsetMs: number;
  loopEndOffsetMs: number;
  leadMaxLeapSemitones: number;
  accidentalNoteCount: number;
  roleCounts: Record<ProceduralMusicNote['role'], number>;
};

export type MusicDebugTheme = MusicDebugSnapshot['theme'];

export type MusicDebugTimelineLayout = {
  width: number;
  height: number;
  leftPad: number;
  rightPad: number;
  topPad: number;
  bottomPad: number;
  trackHeight: number;
  roleOrder: ProceduralMusicNote['role'][];
};

export type MusicDebugSongPlayback = {
  play(
    snapshot: MusicDebugSnapshot,
    region?: MusicDebugPlaybackRegion | null
  ): void;
  stop(): void;
};

export type MusicDebugPlaybackRegion = {
  startOffsetMs: number;
  endOffsetMs: number;
};

export const DEFAULT_MUSIC_DEBUG_OPTIONS: MusicDebugOptions = {
  tileKind: 'forest',
  contextType: 'overworld',
  weatherKind: 'clear',
  weatherIntensity: 0,
  dayProgress: 0.5,
  yearProgress: 0.25,
  clusterX: 0,
  clusterY: 0,
};

export function clampMusicDebugProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function clampMusicDebugWeatherIntensity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizeMusicDebugOptions(
  value: Partial<MusicDebugOptions> | null | undefined
): MusicDebugOptions {
  return {
    tileKind: normalizeTileKind(value?.tileKind),
    contextType: normalizeContextType(value?.contextType),
    weatherKind: normalizeWeatherKind(value?.weatherKind),
    weatherIntensity: clampMusicDebugWeatherIntensity(
      value?.weatherIntensity ?? DEFAULT_MUSIC_DEBUG_OPTIONS.weatherIntensity
    ),
    dayProgress: clampMusicDebugProgress(
      value?.dayProgress ?? DEFAULT_MUSIC_DEBUG_OPTIONS.dayProgress
    ),
    yearProgress: clampMusicDebugProgress(
      value?.yearProgress ?? DEFAULT_MUSIC_DEBUG_OPTIONS.yearProgress
    ),
    clusterX: Math.round(
      value?.clusterX ?? DEFAULT_MUSIC_DEBUG_OPTIONS.clusterX
    ),
    clusterY: Math.round(
      value?.clusterY ?? DEFAULT_MUSIC_DEBUG_OPTIONS.clusterY
    ),
  };
}

export function createMusicDebugSnapshot(
  rawOptions?: Partial<MusicDebugOptions> | null,
  nowMs = 0
): MusicDebugSnapshot {
  const options = normalizeMusicDebugOptions(rawOptions);
  const theme = resolveMusicTheme(options.tileKind, options.contextType);
  const mood = resolveMusicMood({
    dayProgress: options.dayProgress,
    weatherKind:
      options.weatherKind === 'clear' ? undefined : options.weatherKind,
    weatherIntensity: options.weatherIntensity,
  });
  const arrangement = resolveMusicArrangement({
    dayProgress: options.dayProgress,
    yearProgress: options.yearProgress,
    weatherKind:
      options.weatherKind === 'clear' ? undefined : options.weatherKind,
    weatherIntensity: options.weatherIntensity,
  });
  const instrumentBank = createProceduralInstrumentBank(
    theme,
    options.clusterX,
    options.clusterY,
    options
  );
  const chordProgression = [
    ...resolveProceduralChordProgression(
      theme,
      options.clusterX,
      options.clusterY
    ),
  ];
  const leadMotif = [
    ...resolveProceduralLeadMotif(theme, options.clusterX, options.clusterY)
      .degreeOffsets,
  ];
  const leadPhraseCadence = Array.from(
    { length: Math.max(1, theme.stepPattern.length) },
    (_, stepIndex) => resolveProceduralLeadPhraseCadence(theme, stepIndex)
  );
  const song = createProceduralMusicSong({
    nowMs,
    tileKind: options.tileKind,
    contextType: options.contextType,
    weatherKind:
      options.weatherKind === 'clear' ? undefined : options.weatherKind,
    weatherIntensity: options.weatherIntensity,
    dayProgress: options.dayProgress,
    yearProgress: options.yearProgress,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
  });
  const durationMs = song.durationMs;
  const roleCounts: MusicDebugSnapshot['roleCounts'] = {
    lead: 0,
    harmony: 0,
    bass: 0,
    percussion: 0,
  };
  let leadMaxLeapSemitones = 0;
  let accidentalNoteCount = 0;
  let previousLeadFrequency: number | null = null;

  for (const note of song.notes) {
    roleCounts[note.role] += 1;
    const relativeSemitones = Math.round(
      Math.log2(note.frequency / Math.max(theme.rootHz, Number.EPSILON)) * 12
    );
    if (!isProceduralSemitoneInScale(theme.scale, relativeSemitones)) {
      accidentalNoteCount += 1;
    }
    if (note.role !== 'lead') {
      continue;
    }
    if (previousLeadFrequency !== null) {
      const leapSemitones =
        Math.abs(Math.log2(note.frequency / previousLeadFrequency)) * 12;
      leadMaxLeapSemitones = Math.max(leadMaxLeapSemitones, leapSemitones);
    }
    previousLeadFrequency = note.frequency;
  }

  return {
    options,
    theme,
    mood,
    arrangement,
    instrumentBank,
    chordProgression,
    leadMotif,
    leadPhraseCadence,
    song,
    notes: song.notes,
    durationMs,
    loopStartOffsetMs: song.loopStartOffsetMs,
    loopEndOffsetMs: song.loopEndOffsetMs,
    leadMaxLeapSemitones,
    accidentalNoteCount,
    roleCounts,
  };
}

export function randomizeMusicDebugSeed(
  rawOptions?: Partial<MusicDebugOptions> | null,
  random = Math.random
): MusicDebugOptions {
  const options = normalizeMusicDebugOptions(rawOptions);
  const randomized = randomizeDebugCoordinatePair(
    {
      x: options.clusterX,
      y: options.clusterY,
    },
    random
  );
  return {
    ...options,
    clusterX: randomized.x,
    clusterY: randomized.y,
  };
}

export function buildMusicDebugMarkup(
  snapshot: MusicDebugSnapshot = createMusicDebugSnapshot()
): string {
  return `
    <main class="music-debug-shell">
      <section class="music-debug-hero">
        <p class="music-debug-kicker">bworlds</p>
        <h1>Music Laboratory</h1>
        <p class="music-debug-lede">
          Generate, visualize, and audition the current procedural score layers for a chosen biome, season, time of day, and weather state.
        </p>
      </section>
      <section class="music-debug-layout">
        <form id="music-debug-form" class="music-debug-card music-debug-form">
          <div class="music-debug-grid">
            <label>
              <span>Tile</span>
              <select name="tileKind">
                ${buildSelectOptions(
                  [
                    'plains',
                    'forest',
                    'shore',
                    'town',
                    'mountain',
                    'cave',
                    'floor',
                  ],
                  snapshot.options.tileKind
                )}
              </select>
            </label>
            <label>
              <span>Context</span>
              <select name="contextType">
                ${buildSelectOptions(
                  ['overworld', 'town', 'building', 'cave', 'dungeon'],
                  snapshot.options.contextType
                )}
              </select>
            </label>
            <label>
              <span>Weather</span>
              <select name="weatherKind">
                ${buildSelectOptions(
                  ['clear', 'fog', 'light-rain', 'heavy-rain'],
                  snapshot.options.weatherKind
                )}
              </select>
            </label>
            <label>
              <span>Weather Intensity</span>
              <input name="weatherIntensity" type="range" min="0" max="1" step="0.05" value="${snapshot.options.weatherIntensity}" />
            </label>
            <label>
              <span>Day Progress</span>
              <input name="dayProgress" type="range" min="0" max="1" step="0.01" value="${snapshot.options.dayProgress}" />
            </label>
            <label>
              <span>Year Progress</span>
              <input name="yearProgress" type="range" min="0" max="1" step="0.01" value="${snapshot.options.yearProgress}" />
            </label>
            <label>
              <span>Cluster X</span>
              <input name="clusterX" type="number" step="1" value="${snapshot.options.clusterX}" />
            </label>
            <label>
              <span>Cluster Y</span>
              <input name="clusterY" type="number" step="1" value="${snapshot.options.clusterY}" />
            </label>
          </div>
          <div class="music-debug-actions">
            <button id="music-debug-generate" type="submit">Generate</button>
            <button id="music-debug-randomize" type="button">🎲 Generate</button>
            <button id="music-debug-play" type="button">Play Song</button>
            <button id="music-debug-download" type="button">Download MIDI</button>
            <label class="music-debug-toggle">
              <input id="music-debug-loop" type="checkbox" />
              <span>Loop Song</span>
            </label>
          </div>
        </form>
        <section class="music-debug-card">
          <div id="music-debug-summary">${buildMusicDebugSummaryMarkup(snapshot)}</div>
          <canvas id="music-debug-timeline" width="960" height="320"></canvas>
        </section>
      </section>
    </main>
  `;
}

export function buildMusicDebugSummaryMarkup(
  snapshot: MusicDebugSnapshot
): string {
  const instruments = Object.values(snapshot.instrumentBank.instruments)
    .map(
      (instrument) =>
        `<li><strong>${instrument.role}</strong>: ${instrument.family} / ${instrument.waveform} + ${instrument.timbre.harmonicWaveform} @ ${instrument.timbre.harmonicRatio.toFixed(2)}x / ${instrument.timbre.filterType} ${instrument.timbre.filterCutoffHz.toFixed(0)}Hz</li>`
    )
    .join('');

  return `
    <div class="music-debug-summary-grid">
      <div><dt>Theme</dt><dd>${snapshot.theme.id}</dd></div>
      <div><dt>Root Hz</dt><dd>${snapshot.theme.rootHz.toFixed(2)}</dd></div>
      <div><dt>Scheduled Notes</dt><dd>${snapshot.notes.length}</dd></div>
      <div><dt>Song Length</dt><dd>${formatMusicDebugDuration(snapshot.durationMs)}</dd></div>
      <div><dt>Loop Range</dt><dd>${formatMusicDebugLoopRange(snapshot.loopStartOffsetMs, snapshot.loopEndOffsetMs)}</dd></div>
      <div><dt>Tempo</dt><dd>${snapshot.mood.tempoMultiplier.toFixed(2)}x</dd></div>
      <div><dt>Brightness</dt><dd>${snapshot.mood.brightness.toFixed(2)}x</dd></div>
      <div><dt>Lead Max Leap</dt><dd>${snapshot.leadMaxLeapSemitones.toFixed(1)} st</dd></div>
      <div><dt>Accidentals</dt><dd>${snapshot.accidentalNoteCount}</dd></div>
    </div>
    <div class="music-debug-role-counts">
      <span>Bass ${snapshot.roleCounts.bass}</span>
      <span>Harmony ${snapshot.roleCounts.harmony}</span>
      <span>Lead ${snapshot.roleCounts.lead}</span>
      <span>Percussion ${snapshot.roleCounts.percussion}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Sections ${snapshot.song.sections.map((section) => section.label).join(' / ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Chords ${snapshot.chordProgression.map((degree) => degree + 1).join(' - ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Lead Motif ${snapshot.leadMotif.map((degree) => degree + 1).join(' - ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Lead Cadence ${snapshot.leadPhraseCadence.join(' / ')}</span>
    </div>
    <ul class="music-debug-instruments">${instruments}</ul>
  `;
}

export function drawMusicDebugTimeline(
  canvas: HTMLCanvasElement,
  snapshot: MusicDebugSnapshot
): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#071019';
  context.fillRect(0, 0, width, height);

  const leftPad = 84;
  const rightPad = 24;
  const topPad = 22;
  const bottomPad = 24;
  const trackHeight = (height - topPad - bottomPad) / 4;
  const durationMs = Math.max(snapshot.durationMs, 1);
  const roleOrder: Array<ProceduralMusicNote['role']> = [
    'bass',
    'harmony',
    'lead',
    'percussion',
  ];
  const roleColors: Record<ProceduralMusicNote['role'], string> = {
    bass: '#55d6be',
    harmony: '#86b5ff',
    lead: '#ffbf69',
    percussion: '#f27d7d',
  };
  const timelineLayout: MusicDebugTimelineLayout = {
    width,
    height,
    leftPad,
    rightPad,
    topPad,
    bottomPad,
    trackHeight,
    roleOrder,
  };
  const scaleOverlay = createMusicDebugScaleOverlay(snapshot, timelineLayout);

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  for (let index = 0; index <= roleOrder.length; index += 1) {
    const y = topPad + trackHeight * index;
    context.beginPath();
    context.moveTo(leftPad, y);
    context.lineTo(width - rightPad, y);
    context.stroke();
  }

  context.fillStyle = '#9db2bd';
  context.font = '13px Trebuchet MS';
  roleOrder.forEach((role, index) => {
    context.fillText(role.toUpperCase(), 16, topPad + trackHeight * index + 18);
  });

  for (const note of snapshot.notes) {
    const roleIndex = roleOrder.indexOf(note.role);
    const startRatio = (note.startMs - snapshot.notes[0]!.startMs) / durationMs;
    const endRatio =
      (note.startMs + note.durationMs - snapshot.notes[0]!.startMs) /
      durationMs;
    const x = leftPad + startRatio * (width - leftPad - rightPad);
    const barWidth = Math.max(
      2,
      (endRatio - startRatio) * (width - leftPad - rightPad)
    );
    const y = topPad + roleIndex * trackHeight + 10;
    const barHeight = Math.max(10, trackHeight - 18);

    context.fillStyle = roleColors[note.role];
    context.fillRect(x, y, barWidth, barHeight);
  }

  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.lineWidth = 1;
  for (const guide of scaleOverlay.guides) {
    context.beginPath();
    context.moveTo(leftPad, guide.y);
    context.lineTo(width - rightPad, guide.y);
    context.stroke();
  }

  for (const marker of scaleOverlay.markers) {
    context.beginPath();
    context.fillStyle = '#f5f7fb';
    context.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.strokeStyle = roleColors[marker.role];
    context.lineWidth = 2;
    context.arc(marker.x, marker.y, marker.radius + 1.5, 0, Math.PI * 2);
    context.stroke();
  }
}

export function playMusicDebugSong(snapshot: MusicDebugSnapshot): void {
  createMusicDebugSongPlayback().play(snapshot);
}

export function resolveMusicDebugPlaybackRegion(
  snapshot: MusicDebugSnapshot,
  region?: MusicDebugPlaybackRegion | null
): MusicDebugPlaybackRegion {
  const startOffsetMs = clampTimelineOffset(
    region?.startOffsetMs ?? 0,
    snapshot.durationMs
  );
  const endOffsetMs = clampTimelineOffset(
    region?.endOffsetMs ?? snapshot.durationMs,
    snapshot.durationMs
  );

  return {
    startOffsetMs,
    endOffsetMs: Math.max(startOffsetMs, endOffsetMs),
  };
}

export function resolveMusicDebugPlaybackDurationMs(
  snapshot: MusicDebugSnapshot,
  region?: MusicDebugPlaybackRegion | null
): number {
  const resolved = resolveMusicDebugPlaybackRegion(snapshot, region);
  return Math.max(0, resolved.endOffsetMs - resolved.startOffsetMs);
}

export function createMusicDebugSongPlayback(
  sink: MusicSink = createWebAudioMusicSink()
): MusicDebugSongPlayback {
  return {
    play(snapshot, region) {
      const playbackRegion = resolveMusicDebugPlaybackRegion(snapshot, region);
      const startMs = performance.now() + 120;
      const offsetMs = snapshot.song.startMs + playbackRegion.startOffsetMs;
      const endMs = snapshot.song.startMs + playbackRegion.endOffsetMs;
      sink.resume?.();
      for (const note of snapshot.notes) {
        if (note.startMs < offsetMs || note.startMs >= endMs) {
          continue;
        }
        sink.play({
          ...note,
          startMs: startMs + (note.startMs - offsetMs),
        });
      }
    },
    stop() {
      sink.stopAll?.();
    },
  };
}

export function formatMusicDebugDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatMusicDebugLoopRange(
  startOffsetMs: number,
  endOffsetMs: number
): string {
  return `${formatMusicDebugDuration(startOffsetMs)} - ${formatMusicDebugDuration(endOffsetMs)}`;
}

function buildSelectOptions(
  values: readonly string[],
  selectedValue: string
): string {
  return values
    .map((value) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${value}"${selected}>${value}</option>`;
    })
    .join('');
}

function normalizeTileKind(
  value: MusicDebugOptions['tileKind'] | undefined
): MusicDebugTileKind {
  if (
    value === 'forest' ||
    value === 'shore' ||
    value === 'town' ||
    value === 'mountain' ||
    value === 'cave' ||
    value === 'floor'
  ) {
    return value;
  }
  return 'plains';
}

function normalizeContextType(
  value: MusicDebugOptions['contextType'] | undefined
): MusicDebugContextType {
  if (
    value === 'town' ||
    value === 'building' ||
    value === 'cave' ||
    value === 'dungeon'
  ) {
    return value;
  }
  return 'overworld';
}

function normalizeWeatherKind(
  value: MusicDebugOptions['weatherKind'] | undefined
): MusicDebugWeatherKind {
  if (value === 'fog' || value === 'light-rain' || value === 'heavy-rain') {
    return value;
  }
  return 'clear';
}

function clampTimelineOffset(value: number, durationMs: number): number {
  return Math.min(durationMs, Math.max(0, Math.round(value)));
}
