import type { ViewMode } from '@bworlds/plugin-api';
import type { TextViewportGrid } from '@bworlds/render2d';
import type {
  CompassDisplayMode,
  TimekeeperDisplayMode,
} from './time-controls.ts';

export type EventDetailKind =
  | 'aurora'
  | 'meteor-shower'
  | 'comet'
  | 'eclipse'
  | 'planet'
  | 'none';
export type EventDetail = { kind: EventDetailKind; label: string };

type StatusSignatureOptions = {
  viewMode: ViewMode;
  contextLabel: string;
  tileLabel: string;
  facing: string;
  playerX: number;
  playerY: number;
  gridX: number;
  gridY: number;
  latitude: number;
  longitude: number;
  timeLabel: string;
  dateLabel: string;
  cycleLabel: string;
  seasonLabel: string;
  moonLabel: string;
  weatherLabel: string;
  forecastLabel: string;
  eventModeLabel: string;
  eventsLabel: string;
  sunriseLabel: string;
  depth: number;
  hint: string;
};

type ViewportHudSignatureOptions = {
  timekeeperDisplayMode: TimekeeperDisplayMode;
  compassDisplayMode: CompassDisplayMode;
  timeLabel: string;
  dateLabel: string;
  facing: string;
  headingLabel: string;
  showCompass: boolean;
};

type EventSummarySignatureOptions = {
  modeLabel: string;
  activeEventsLabel: string;
  detailLabels: string[];
};

type SextantSignatureOptions = {
  latitude: number;
  longitude: number;
  gridX: number;
  gridY: number;
};

export function getStatusSignature(options: StatusSignatureOptions): string {
  return [
    options.viewMode,
    options.contextLabel,
    options.tileLabel,
    options.facing,
    options.playerX.toFixed(2),
    options.playerY.toFixed(2),
    options.gridX,
    options.gridY,
    options.latitude.toFixed(4),
    options.longitude.toFixed(4),
    options.timeLabel,
    options.dateLabel,
    options.cycleLabel,
    options.seasonLabel,
    options.moonLabel,
    options.weatherLabel,
    options.forecastLabel,
    options.eventModeLabel,
    options.eventsLabel,
    options.sunriseLabel,
    options.depth,
    options.hint,
  ].join('|');
}

export function getViewportHudSignature(
  options: ViewportHudSignatureOptions
): string {
  return [
    options.timekeeperDisplayMode,
    options.compassDisplayMode,
    options.timeLabel,
    options.dateLabel,
    options.facing,
    options.headingLabel,
    options.showCompass ? '1' : '0',
  ].join('|');
}

export function getEventSummarySignature(
  options: EventSummarySignatureOptions
): string {
  return [
    options.modeLabel,
    options.activeEventsLabel,
    ...options.detailLabels,
  ].join('|');
}

export function getSextantSignature(options: SextantSignatureOptions): string {
  return [
    options.latitude.toFixed(4),
    options.longitude.toFixed(4),
    options.gridX,
    options.gridY,
  ].join('|');
}

export function getDetailLabels(details: EventDetail[]): string[] {
  return details.map((detail) => `${detail.kind}:${detail.label}`);
}

export function getTextViewportSignature(grid: TextViewportGrid): string {
  return grid.rows
    .map((row) => row.map((cell) => `${cell.glyph}${cell.color}`).join(''))
    .join('|');
}

export function buildTextViewportMarkup(grid: TextViewportGrid): string {
  return grid.rows
    .map(
      (row) =>
        `<div class="viewport-text-row">${row
          .map(
            (cell) =>
              `<span class="viewport-text-cell" style="color:${cell.color}" data-kind="${cell.kind}">${cell.glyph}</span>`
          )
          .join('')}</div>`
    )
    .join('');
}

export function buildStatusMarkup(options: StatusSignatureOptions): string {
  return `
    <div><dt>View</dt><dd>${options.viewMode.toUpperCase()}</dd></div>
    <div><dt>Place</dt><dd>${options.contextLabel}</dd></div>
    <div><dt>Tile</dt><dd>${options.tileLabel}</dd></div>
    <div><dt>Facing</dt><dd>${options.facing}</dd></div>
    <div><dt>World</dt><dd>${options.playerX.toFixed(2)}, ${options.playerY.toFixed(2)}</dd></div>
    <div><dt>Grid</dt><dd>${options.gridX}, ${options.gridY}</dd></div>
    <div><dt>GPS</dt><dd>${options.latitude.toFixed(4)}, ${options.longitude.toFixed(4)}</dd></div>
    <div><dt>Time</dt><dd>${options.timeLabel}</dd></div>
    <div><dt>Date</dt><dd>${options.dateLabel}</dd></div>
    <div><dt>Cycle</dt><dd>${options.cycleLabel}</dd></div>
    <div><dt>Season</dt><dd>${options.seasonLabel}</dd></div>
    <div><dt>Moon</dt><dd>${options.moonLabel}</dd></div>
    <div><dt>Weather</dt><dd>${options.weatherLabel}</dd></div>
    <div><dt>Forecast</dt><dd>${options.forecastLabel}</dd></div>
    <div><dt>Event Mode</dt><dd>${options.eventModeLabel}</dd></div>
    <div><dt>Events</dt><dd>${options.eventsLabel}</dd></div>
    <div><dt>Sunrise</dt><dd>${options.sunriseLabel}</dd></div>
    <div><dt>Depth</dt><dd>${options.depth}</dd></div>
    <div><dt>Hint</dt><dd>${options.hint}</dd></div>
  `;
}

export function buildViewportHudMarkup(
  options: ViewportHudSignatureOptions & {
    compassMarkup: string;
  }
): string {
  const showTime = options.timekeeperDisplayMode === 'time';
  const showTimeDate = options.timekeeperDisplayMode === 'time-date';
  const showCompassText =
    options.showCompass && options.compassDisplayMode === 'letters';
  const showCompassMeta =
    options.showCompass && options.compassDisplayMode !== 'hidden';
  return `
      ${
        showTime || showTimeDate
          ? `<div class="viewport-hud-label">${options.timeLabel}</div>`
          : ''
      }
      ${
        showTimeDate
          ? `<div class="viewport-hud-date">${options.dateLabel}</div>`
          : ''
      }
      ${
        showCompassMeta
          ? `<div class="viewport-hud-meta">Facing ${options.facing}</div>
      <div class="viewport-hud-meta">${options.headingLabel}</div>`
          : ''
      }
      ${
        showCompassText
          ? `<div class="viewport-hud-compass">${options.compassMarkup}</div>`
          : ''
      }
    `;
}

export function buildEventSummaryMarkup(
  options: {
    modeLabel: string;
    activeEventsLabel: string;
    details: EventDetail[];
  }
): string {
  return `
      <div class="event-summary-label">Mode: ${options.modeLabel}</div>
      <div class="event-summary-active">${options.activeEventsLabel}</div>
      <div class="event-summary-chips">
        ${options.details
          .map(
            (detail) =>
              `<span class="event-summary-chip event-summary-chip-${detail.kind}">${detail.label}</span>`
          )
          .join('')}
      </div>
    `;
}

export function buildSextantMarkup(options: SextantSignatureOptions): string {
  return `
      <div><dt>GPS</dt><dd>${options.latitude.toFixed(4)}, ${options.longitude.toFixed(4)}</dd></div>
      <div><dt>World</dt><dd>${options.gridX}, ${options.gridY}</dd></div>
    `;
}
