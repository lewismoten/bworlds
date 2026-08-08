import type { getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export interface OrreryBodyLike {
  id: string;
  type: 'sun' | 'moon' | 'planet' | 'comet';
  orbitRadius: number;
  angle: number;
  color: string;
  size: number;
  trailLength: number;
}

export function getOrreryBodies(cycle: DaylightCycleLike): OrreryBodyLike[] {
  const bodies: OrreryBodyLike[] = [
    {
      id: 'sun',
      type: 'sun',
      orbitRadius: 0,
      angle: 0,
      color: '#ffd06e',
      size: 0.92,
      trailLength: 0,
    },
    {
      id: 'moon',
      type: 'moon',
      orbitRadius: 2.6,
      angle: normalizeTurns((cycle.moonAngle + Math.PI / 2) / (Math.PI * 2)),
      color: '#dce8ff',
      size: 0.42 + cycle.moonIllumination * 0.16,
      trailLength: 0,
    },
  ];

  let orbitIndex = 0;
  (cycle.visibleEvents ?? []).forEach((event) => {
    if (event.type === 'meteor-shower') {
      return;
    }

    orbitIndex += 1;
    bodies.push({
      id: `${event.type}:${event.name}`,
      type: event.type === 'planet' ? 'planet' : 'comet',
      orbitRadius: 3.6 + orbitIndex * 0.75,
      angle: normalizeTurns(event.progress),
      color: event.color,
      size: Math.max(0.24, event.size * (event.type === 'planet' ? 0.5 : 0.42)),
      trailLength: event.trailLength,
    });
  });

  return bodies;
}

function normalizeTurns(value: number) {
  return ((value % 1) + 1) % 1;
}
