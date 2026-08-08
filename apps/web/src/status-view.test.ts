import { describe, expect, it } from 'vitest';
import { createStatusView, createViewportHudView } from './status-view.ts';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    for (const token of tokens) {
      this.values.add(token);
    }
  }

  remove(...tokens: string[]) {
    for (const token of tokens) {
      this.values.delete(token);
    }
  }

  toggle(token: string, force?: boolean) {
    if (force === true) {
      this.values.add(token);
      return true;
    }
    if (force === false) {
      this.values.delete(token);
      return false;
    }
    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }
    this.values.add(token);
    return true;
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

class FakeElement {
  ownerDocument: FakeDocument;
  tagName: string;
  children: FakeElement[] = [];
  className = '';
  classList = new FakeClassList();
  hidden = false;
  textContent = '';

  constructor(ownerDocument: FakeDocument, tagName: string) {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toLowerCase();
  }

  append(...nodes: FakeElement[]) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]) {
    this.children = [...nodes];
  }
}

class FakeDocument {
  createElement(tagName: string) {
    return new FakeElement(this, tagName);
  }
}

describe('status view', () => {
  it('creates the status rows once and updates text content in place', () => {
    const document = new FakeDocument();
    const host = document.createElement('dl') as unknown as HTMLElement;
    const view = createStatusView(host);
    const rows = (host as unknown as FakeElement).children;
    const initialRowCount = rows.length;
    const initialHintNode = rows[rows.length - 1]?.children[1];

    view.update({
      viewMode: '3d',
      playerLevel: 4,
      contextLabel: 'Overworld',
      tileLabel: 'Grassland',
      facing: 'N',
      playerX: 12.345,
      playerY: -6.789,
      gridX: 12,
      gridY: -7,
      latitude: 24.1234,
      longitude: -70.5678,
      timeLabel: '08:30',
      dateLabel: 'Late Summer',
      cycleLabel: 'Running',
      seasonLabel: 'The Heron',
      moonLabel: 'Waxing Gibbous',
      weatherLabel: 'Clear',
      forecastLabel: 'Fine all week',
      eventModeLabel: 'Auto',
      eventsLabel: 'No active events',
      sunriseLabel: 'E',
      depth: 0,
      hint: 'Explore the frontier.',
    });
    view.update({
      viewMode: 'text',
      playerLevel: 5,
      contextLabel: 'Town',
      tileLabel: 'Road',
      facing: 'W',
      playerX: 1,
      playerY: 2,
      gridX: 1,
      gridY: 2,
      latitude: 1.2345,
      longitude: 6.789,
      timeLabel: '09:45',
      dateLabel: 'Harvest 12',
      cycleLabel: 'Frozen',
      seasonLabel: 'The Stag',
      moonLabel: 'Full Moon',
      weatherLabel: 'Rain',
      forecastLabel: 'Storm tomorrow',
      eventModeLabel: 'Aurora',
      eventsLabel: 'Aurora active',
      sunriseLabel: 'NE',
      depth: 1,
      hint: 'Press Enter to interact.',
    });

    expect(rows).toHaveLength(initialRowCount);
    expect(rows[rows.length - 1]?.children[1]).toBe(initialHintNode);
    expect(rows[0]?.children[1]?.textContent).toBe('TEXT');
    expect(rows[2]?.children[1]?.textContent).toBe('Town');
    expect(rows[rows.length - 1]?.children[1]?.textContent).toBe(
      'Press Enter to interact.'
    );
  });

  it('updates the viewport hud without rebuilding its children', () => {
    const document = new FakeDocument();
    const host = document.createElement('div') as unknown as HTMLElement;
    const view = createViewportHudView(host);
    const hostNode = host as unknown as FakeElement;
    const initialChildCount = hostNode.children.length;
    const initialCompassNode = hostNode.children[4];

    view.update({
      timekeeperDisplayMode: 'time-date',
      compassDisplayMode: 'letters',
      timeLabel: '10:15',
      dateLabel: 'Harvest 12',
      facing: 'E',
      headingLabel: 'Heading NE',
      showCompass: true,
      interactionPrompt: 'Press E to enter',
    });
    view.update({
      timekeeperDisplayMode: 'hidden',
      compassDisplayMode: 'letters',
      timeLabel: '11:20',
      dateLabel: 'Harvest 13',
      facing: 'S',
      headingLabel: 'Heading S',
      showCompass: false,
      interactionPrompt: '',
    });

    expect(hostNode.children).toHaveLength(initialChildCount);
    expect(hostNode.children[4]).toBe(initialCompassNode);
    expect(hostNode.children[0]?.hidden).toBe(true);
    expect(hostNode.children[5]?.hidden).toBe(true);
    expect(hostNode.children[4]?.children[2]?.classList.contains('is-active')).toBe(true);
  });
});
