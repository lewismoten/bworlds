import { type getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export function getStatusSignature(options: {
  viewMode: string;
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
  eventModeLabel: string;
  eventsLabel: string;
  sunriseLabel: string;
  depth: number;
  hint: string;
}) {
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
    options.eventModeLabel,
    options.eventsLabel,
    options.sunriseLabel,
    options.depth,
    options.hint,
  ].join('|');
}

export function getViewportHudSignature(options: {
  timeLabel: string;
  facing: string;
  headingLabel: string;
  showCompass: boolean;
}) {
  return [
    options.timeLabel,
    options.facing,
    options.headingLabel,
    options.showCompass ? '1' : '0',
  ].join('|');
}

export function getEventSummarySignature(options: {
  modeLabel: string;
  activeEventsLabel: string;
  detailLabels: string[];
}) {
  return [
    options.modeLabel,
    options.activeEventsLabel,
    ...options.detailLabels,
  ].join('|');
}

export function getDetailLabels(
  details: Array<{ kind: string; label: string }>
) {
  return details.map((detail) => `${detail.kind}:${detail.label}`);
}

export function buildStatusMarkup(options: {
  viewMode: string;
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
  eventModeLabel: string;
  eventsLabel: string;
  sunriseLabel: string;
  depth: number;
  hint: string;
}) {
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
    <div><dt>Event Mode</dt><dd>${options.eventModeLabel}</dd></div>
    <div><dt>Events</dt><dd>${options.eventsLabel}</dd></div>
    <div><dt>Sunrise</dt><dd>${options.sunriseLabel}</dd></div>
    <div><dt>Depth</dt><dd>${options.depth}</dd></div>
    <div><dt>Hint</dt><dd>${options.hint}</dd></div>
  `;
}

export function buildViewportHudMarkup(options: {
  timeLabel: string;
  facing: string;
  headingLabel: string;
  showCompass: boolean;
  compassMarkup: string;
}) {
  return `
      <div class="viewport-hud-label">${options.timeLabel}</div>
      <div class="viewport-hud-meta">Facing ${options.facing}</div>
      <div class="viewport-hud-meta">${options.headingLabel}</div>
      ${
        options.showCompass
          ? `<div class="viewport-hud-compass">${options.compassMarkup}</div>`
          : ''
      }
    `;
}

export function buildEventSummaryMarkup(options: {
  modeLabel: string;
  activeEventsLabel: string;
  details: Array<{ kind: string; label: string }>;
}) {
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
