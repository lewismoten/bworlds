type CelestialEventSummaryCycle = {
  auroraBands?: Array<{ intensity: number }>;
  visibleEvents?: Array<{ type?: string; visibility?: number }>;
  solarEclipse?: { active?: boolean; coverage?: number };
};

type CelestialEventDetail = {
  kind: 'aurora' | 'meteor-shower' | 'comet' | 'eclipse' | 'none';
  label: string;
};

type CelestialEventSummary = {
  auroraCount: number;
  meteorCount: number;
  cometCount: number;
  eclipseCoverage: number;
};

const ACTIVE_EVENT_THRESHOLD = 0.03;

export function summarizeCelestialEvents(
  cycle: CelestialEventSummaryCycle
): CelestialEventSummary {
  let auroraCount = 0;
  const auroraBands = cycle.auroraBands ?? [];
  for (let index = 0; index < auroraBands.length; index += 1) {
    if ((auroraBands[index]?.intensity ?? 0) > ACTIVE_EVENT_THRESHOLD) {
      auroraCount += 1;
    }
  }

  let meteorCount = 0;
  let cometCount = 0;
  const visibleEvents = cycle.visibleEvents ?? [];
  for (let index = 0; index < visibleEvents.length; index += 1) {
    const event = visibleEvents[index];
    if ((event?.visibility ?? 0) <= ACTIVE_EVENT_THRESHOLD) {
      continue;
    }
    if (event?.type === 'meteor-shower') {
      meteorCount += 1;
    } else if (event?.type === 'comet') {
      cometCount += 1;
    }
  }

  const eclipseCoverage =
    cycle.solarEclipse?.active ? (cycle.solarEclipse.coverage ?? 0) : 0;

  return {
    auroraCount,
    meteorCount,
    cometCount,
    eclipseCoverage,
  };
}

export function describeActiveCelestialEvents(
  summary: CelestialEventSummary
): string {
  const activeEvents: string[] = [];
  if (summary.auroraCount > 0) {
    activeEvents.push('Aurora active');
  }
  if (summary.meteorCount > 0) {
    activeEvents.push('Meteor shower visible');
  }
  if (summary.eclipseCoverage > ACTIVE_EVENT_THRESHOLD) {
    activeEvents.push('Solar eclipse active');
  }
  if (summary.cometCount > 0) {
    activeEvents.push('Comet visible');
  }
  return activeEvents.length > 0 ? activeEvents.join(' • ') : 'No active events';
}

export function getActiveCelestialEventDetails(
  summary: CelestialEventSummary
): CelestialEventDetail[] {
  const details: CelestialEventDetail[] = [];

  if (summary.auroraCount > 0) {
    details.push({
      kind: 'aurora',
      label: `${summary.auroraCount} aurora band${summary.auroraCount === 1 ? '' : 's'}`,
    });
  }
  if (summary.meteorCount > 0) {
    details.push({
      kind: 'meteor-shower',
      label: `${summary.meteorCount} meteor stream${summary.meteorCount === 1 ? '' : 's'}`,
    });
  }
  if (summary.cometCount > 0) {
    details.push({
      kind: 'comet',
      label: `${summary.cometCount} comet trail${summary.cometCount === 1 ? '' : 's'}`,
    });
  }
  if (summary.eclipseCoverage > ACTIVE_EVENT_THRESHOLD) {
    details.push({
      kind: 'eclipse',
      label: `Eclipse ${(summary.eclipseCoverage * 100).toFixed(0)}%`,
    });
  }

  if (details.length === 0) {
    details.push({
      kind: 'none',
      label: 'Switch to Model to inspect sky changes',
    });
  }

  return details;
}
