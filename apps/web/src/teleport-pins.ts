export type TeleportPin = {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: number;
};

export function normalizeTeleportPins(value: unknown): TeleportPin[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const pins: TeleportPin[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const candidate = value[index];
    const normalized = normalizeTeleportPin(candidate);
    if (normalized) {
      pins.push(normalized);
    }
  }
  return pins;
}

export function normalizeTeleportPin(value: unknown): TeleportPin | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<Record<keyof TeleportPin, unknown>>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.x !== 'number' ||
    typeof candidate.y !== 'number' ||
    typeof candidate.facing !== 'number'
  ) {
    return null;
  }
  const id = candidate.id.trim();
  const name = candidate.name.trim();
  if (!id || !name) {
    return null;
  }
  return {
    id,
    name,
    x: normalizeCoordinate(candidate.x),
    y: normalizeCoordinate(candidate.y),
    facing: normalizeFacing(candidate.facing),
  };
}

export function createTeleportPin(options: {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: number;
}): TeleportPin {
  return {
    id: options.id.trim(),
    name: options.name.trim(),
    x: normalizeCoordinate(options.x),
    y: normalizeCoordinate(options.y),
    facing: normalizeFacing(options.facing),
  };
}

function normalizeCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function normalizeFacing(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
}
