export type SoundVariationRecognition = 'low' | 'medium' | 'high';

export type SoundVariationPolicy = {
  candidateCount?: number;
  frequentWindowMs?: number;
  historySize?: number;
  recognition?: SoundVariationRecognition;
  rareCooldownMs?: number;
  rareEvery?: number;
  rareSlotCount?: number;
  variationSlotCount?: number;
};

type SoundVariationState = {
  cycleCursor: number;
  lastPlayedAtMs: number;
  lastRareAtMs: number;
  playCount: number;
  recentIndexes: number[];
  rareCursor: number;
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
const DEFAULT_RARE_COOLDOWN_MS = 6_000;
const DEFAULT_RARE_EVERY = 6;

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
      lastRareAtMs: -Infinity,
      playCount: 0,
      recentIndexes: [],
      rareCursor: 0,
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
    const rareCooldownMs = Math.max(
      1,
      policy.rareCooldownMs ?? DEFAULT_RARE_COOLDOWN_MS
    );
    const rareEvery = Math.max(2, policy.rareEvery ?? DEFAULT_RARE_EVERY);
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
    const rareSlotCount = Math.min(
      Math.max(0, slotCount - 2),
      Math.max(0, policy.rareSlotCount ?? (recognition === 'low' ? 1 : 0))
    );
    const normalSlotCount = Math.max(2, slotCount - rareSlotCount);
    const rareEligible =
      frequent &&
      rareSlotCount > 0 &&
      state.playCount > 0 &&
      state.playCount % rareEvery === 0 &&
      nowMs - state.lastRareAtMs >= rareCooldownMs;

    if (rareEligible) {
      const bestRareIndex =
        normalSlotCount + (state.rareCursor % Math.max(1, rareSlotCount));
      state.cycleCursor = (bestRareIndex + 1) % normalSlotCount;
      state.lastPlayedAtMs = nowMs;
      state.lastRareAtMs = nowMs;
      state.playCount += 1;
      state.rareCursor = (state.rareCursor + 1) % Math.max(1, rareSlotCount);
      state.recentIndexes = [bestRareIndex, ...state.recentIndexes].slice(
        0,
        historySize
      );
      return bestRareIndex;
    }

    let bestIndex = state.cycleCursor;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let offset = 0; offset < candidateCount; offset += 1) {
      const index = (state.cycleCursor + offset) % normalSlotCount;
      const score = scoreVariationCandidate(index, offset, state, {
        frequent,
        historySize,
      });
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    state.cycleCursor = (bestIndex + 1) % normalSlotCount;
    state.lastPlayedAtMs = nowMs;
    state.playCount += 1;
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
