import type {
  CompassDisplayMode,
  TimekeeperDisplayMode,
} from './time-controls.ts';
import type { ViewMode } from '@bworlds/plugin-api';

export type StatusViewOptions = {
  viewMode: ViewMode;
  playerLevel: number;
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

export type ViewportHudViewOptions = {
  timekeeperDisplayMode: TimekeeperDisplayMode;
  compassDisplayMode: CompassDisplayMode;
  timeLabel: string;
  dateLabel: string;
  facing: string;
  headingLabel: string;
  showCompass: boolean;
  interactionPrompt: string;
};

type StatusFieldDefinition = {
  label: string;
  resolveValue(options: StatusViewOptions): string;
};

const STATUS_FIELD_DEFINITIONS: StatusFieldDefinition[] = [
  { label: 'View', resolveValue: (options) => options.viewMode.toUpperCase() },
  { label: 'Level', resolveValue: (options) => String(options.playerLevel) },
  { label: 'Place', resolveValue: (options) => options.contextLabel },
  { label: 'Tile', resolveValue: (options) => options.tileLabel },
  { label: 'Facing', resolveValue: (options) => options.facing },
  {
    label: 'World',
    resolveValue: (options) =>
      `${options.playerX.toFixed(2)}, ${options.playerY.toFixed(2)}`,
  },
  {
    label: 'Grid',
    resolveValue: (options) => `${options.gridX}, ${options.gridY}`,
  },
  {
    label: 'GPS',
    resolveValue: (options) =>
      `${options.latitude.toFixed(4)}, ${options.longitude.toFixed(4)}`,
  },
  { label: 'Time', resolveValue: (options) => options.timeLabel },
  { label: 'Date', resolveValue: (options) => options.dateLabel },
  { label: 'Cycle', resolveValue: (options) => options.cycleLabel },
  { label: 'Season', resolveValue: (options) => options.seasonLabel },
  { label: 'Moon', resolveValue: (options) => options.moonLabel },
  { label: 'Weather', resolveValue: (options) => options.weatherLabel },
  { label: 'Forecast', resolveValue: (options) => options.forecastLabel },
  { label: 'Event Mode', resolveValue: (options) => options.eventModeLabel },
  { label: 'Events', resolveValue: (options) => options.eventsLabel },
  { label: 'Sunrise', resolveValue: (options) => options.sunriseLabel },
  { label: 'Depth', resolveValue: (options) => String(options.depth) },
  { label: 'Hint', resolveValue: (options) => options.hint },
];

export function createStatusView(host: HTMLElement) {
  const valueNodes = STATUS_FIELD_DEFINITIONS.map((field) =>
    appendDefinitionValue(host, field.label)
  );

  return {
    update(options: StatusViewOptions): void {
      for (let index = 0; index < STATUS_FIELD_DEFINITIONS.length; index += 1) {
        valueNodes[index]!.textContent =
          STATUS_FIELD_DEFINITIONS[index]!.resolveValue(options);
      }
    },
  };
}

export function createViewportHudView(host: HTMLElement) {
  host.replaceChildren();
  const timeNode = appendHudBlock(host, 'viewport-hud-label');
  const dateNode = appendHudBlock(host, 'viewport-hud-date');
  const facingNode = appendHudBlock(host, 'viewport-hud-meta');
  const headingNode = appendHudBlock(host, 'viewport-hud-meta');
  const compassNode = host.ownerDocument.createElement('div');
  compassNode.className = 'viewport-hud-compass';
  const compassLetterNodes = ['N', 'E', 'S', 'W'].map((direction) => {
    const span = host.ownerDocument.createElement('span');
    span.textContent = direction;
    compassNode.append(span);
    return span;
  });
  host.append(compassNode);
  const promptNode = appendHudBlock(host, 'viewport-hud-prompt');

  return {
    update(options: ViewportHudViewOptions): void {
      const showTime = options.timekeeperDisplayMode === 'time';
      const showTimeDate = options.timekeeperDisplayMode === 'time-date';
      const showCompassText =
        options.showCompass && options.compassDisplayMode === 'letters';
      const showCompassMeta =
        options.showCompass && options.compassDisplayMode !== 'hidden';

      setBlockVisibility(timeNode, showTime || showTimeDate);
      timeNode.textContent = options.timeLabel;

      setBlockVisibility(dateNode, showTimeDate);
      dateNode.textContent = options.dateLabel;

      setBlockVisibility(facingNode, showCompassMeta);
      facingNode.textContent = `Facing ${options.facing}`;

      setBlockVisibility(headingNode, showCompassMeta);
      headingNode.textContent = options.headingLabel;

      setBlockVisibility(compassNode, showCompassText);
      for (const letterNode of compassLetterNodes) {
        letterNode.classList.toggle(
          'is-active',
          letterNode.textContent === options.facing
        );
      }

      setBlockVisibility(promptNode, options.interactionPrompt.length > 0);
      promptNode.textContent = options.interactionPrompt;
    },
  };
}

function appendDefinitionValue(host: HTMLElement, label: string): HTMLElement {
  const row = host.ownerDocument.createElement('div');
  const term = host.ownerDocument.createElement('dt');
  const definition = host.ownerDocument.createElement('dd');
  term.textContent = label;
  row.append(term, definition);
  host.append(row);
  return definition;
}

function appendHudBlock(host: HTMLElement, className: string): HTMLElement {
  const element = host.ownerDocument.createElement('div');
  element.className = className;
  host.append(element);
  return element;
}

function setBlockVisibility(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
  element.classList.toggle('is-hidden', !visible);
}
