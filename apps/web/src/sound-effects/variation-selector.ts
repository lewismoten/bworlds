export type SoundVariationRecognition = 'low' | 'medium' | 'high';

export type SoundVariationPolicy = {
  candidateCount?: number;
  frequentWindowMs?: number;
  historySize?: number;
  recognition?: SoundVariationRecognition;
  variationSlotCount?: number;
};

type SoundVariationState = {
  cycleCursor: number;
  lastPlayedAtMs: number;
  recentIndexes: number[];
};

type SoundVariationSelector = {
  select(
    signature: string,
    nowMs: number,
    policy?: SoundVariationPolicy
  ): number;
};

const DEFAULT_VARIATION_SLOT_COUNT = 8;
const DEFAULT_FREQUENT_WINDOW_MS = 1_200;
const DEFAULT_HISTORY_SIZE = 3;

const RECOGNITION_SETTINGS: Record<
  SoundVariationRecognition,
  {
    candidateCount: number;
    historySize: number;
    variationSlotCount: number;
  }
> = {
  low: {
    candidateCount: 5,
    historySize: 4,
    variationSlotCount: 8,
  },
  medium: {
    candidateCount: 4,
    historySize: 3,
    variationSlotCount: 6,
  },
  high: {
    candidateCount: 3,
    historySize: 2,
    variationSlotCount: 3,
  },
};

const CANDIDATE_WEIGHTS = [1, 0.82, 0.66, 0.5, 0.38, 0.28, 0.2, 0.14];

export function createSoundVariationSelector(): SoundVariationSelector {
  const states = new Map<string, SoundVariationState>();

  function getState(signature: string): SoundVariationState {
    let state = states.get(signature);
    if (state) {
      return state;
    }
    state = {
      cycleCursor: 0,
      lastPlayedAtMs: -Infinity,
      recentIndexes: [],
    };
    states.set(signature, state);
    return state;
  }

  function select(
    signature: string,
    nowMs: number,
    policy: SoundVariationPolicy = {}
  ): number {
    const state = getState(signature);
    const recognition = policy.recognition ?? 'medium';
    const slotCount = Math.max(
      2,
      policy.variationSlotCount ??
        RECOGNITION_SETTINGS[recognition].variationSlotCount ??
        DEFAULT_VARIATION_SLOT_COUNT
    );
    const frequentWindowMs = Math.max(
      1,
      policy.frequentWindowMs ?? DEFAULT_FREQUENT_WINDOW_MS
    );
    const intervalMs = nowMs - state.lastPlayedAtMs;
    const frequent = intervalMs <= frequentWindowMs;
    const baseCandidateCount = RECOGNITION_SETTINGS[recognition].candidateCount;
    const baseHistorySize = RECOGNITION_SETTINGS[recognition].historySize;
    const candidateCount = Math.min(
      slotCount,
      Math.max(
        2,
        policy.candidateCount ??
          (frequent ? baseCandidateCount : baseCandidateCount - 1)
      )
    );
    const historySize = Math.min(
      slotCount - 1,
      Math.max(
        1,
        policy.historySize ?? (frequent ? baseHistorySize : baseHistorySize - 1)
      )
    );

    let bestIndex = state.cycleCursor;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let offset = 0; offset < candidateCount; offset += 1) {
      const index = (state.cycleCursor + offset) % slotCount;
      const score = scoreVariationCandidate(index, offset, state, {
        frequent,
        historySize,
      });
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    state.cycleCursor = (bestIndex + 1) % slotCount;
    state.lastPlayedAtMs = nowMs;
    state.recentIndexes = [bestIndex, ...state.recentIndexes].slice(
      0,
      historySize
    );
    return bestIndex;
  }

  return {
    select,
  };
}

function scoreVariationCandidate(
  index: number,
  offset: number,
  state: SoundVariationState,
  options: {
    frequent: boolean;
    historySize: number;
  }
): number {
  const recentPosition = state.recentIndexes.indexOf(index);
  const baseWeight = CANDIDATE_WEIGHTS[offset] ?? 0.1;
  let score = baseWeight;

  if (recentPosition === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  if (recentPosition > 0) {
    score -= 0.35 / recentPosition;
  }

  if (options.frequent) {
    score += Math.min(offset, options.historySize) * 0.08;
  } else {
    score -= offset * 0.04;
  }

  return score;
}
