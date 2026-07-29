export interface InteractionSignal {
  type: "message_sent" | "tool_use" | "goal_complete" | "goal_fail" | "session_start" | "session_end" | "command_used" | "feedback";
  timestamp: number;
  detail: string;
  value: number;
}

export interface AdaptationWeights {
  moodEnergy: number;
  proactivity: number;
  systemPromptWeight: number;
  routineAdherence: number;
  responseStyle: number;
}

export interface BanditArm {
  name: string;
  pulls: number;
  rewards: number;
}

export interface FeedbackEntry {
  timestamp: number;
  signal: InteractionSignal;
  score: number;
}

const DEFAULT_WEIGHTS: AdaptationWeights = {
  moodEnergy: 0.5,
  proactivity: 0.5,
  systemPromptWeight: 0.5,
  routineAdherence: 0.5,
  responseStyle: 0.5,
};

const EPSILON = 0.1;
const DECAY_RATE = 0.995;
const META_WEIGHT_DECAY = 0.999;

export function createAdaptationState(): {
  weights: AdaptationWeights;
  bandits: BanditArm[];
  feedbackLog: FeedbackEntry[];
  sessionCount: number;
  totalInteractions: number;
  lastAdaptationTs: number;
} {
  return {
    weights: { ...DEFAULT_WEIGHTS },
    bandits: [
      { name: "casual", pulls: 0, rewards: 0 },
      { name: "focused", pulls: 0, rewards: 0 },
      { name: "creative", pulls: 0, rewards: 0 },
    ],
    feedbackLog: [],
    sessionCount: 0,
    totalInteractions: 0,
    lastAdaptationTs: Date.now(),
  };
}

export function recordInteraction(
  state: { weights: AdaptationWeights; feedbackLog: FeedbackEntry[]; totalInteractions: number },
  signal: InteractionSignal,
  score: number,
): void {
  state.feedbackLog.push({ timestamp: Date.now(), signal, score });
  state.totalInteractions++;
  if (state.feedbackLog.length > 500) {
    state.feedbackLog.splice(0, state.feedbackLog.length - 500);
  }
}

export function computeReward(signal: InteractionSignal): number {
  switch (signal.type) {
    case "goal_complete":
      return 1.0;
    case "goal_fail":
      return -0.5;
    case "session_end":
      return signal.value > 30000 ? 0.3 : 0.0;
    case "command_used":
      return 0.2;
    case "tool_use":
      return 0.1;
    case "feedback":
      return signal.value;
    default:
      return 0.0;
  }
}

export function adaptWeights(state: { weights: AdaptationWeights; feedbackLog: FeedbackEntry[] }): AdaptationWeights {
  const recent = state.feedbackLog.slice(-50);
  if (recent.length < 5) {
    return state.weights;
  }

  const goalCompleteRate = recent.filter((f) => f.signal.type === "goal_complete").length / Math.max(1, recent.filter((f) => f.signal.type === "goal_complete" || f.signal.type === "goal_fail").length);
  const avgScore = recent.reduce((sum, f) => sum + f.score, 0) / recent.length;
  const sessionEnds = recent.filter((f) => f.signal.type === "session_end");
  const avgSessionLength = sessionEnds.length > 0 ? sessionEnds.reduce((s, f) => s + f.signal.value, 0) / sessionEnds.length : 0;

  const newWeights = { ...state.weights };

  newWeights.moodEnergy += (avgScore - 0.5) * 0.05;
  newWeights.proactivity += (goalCompleteRate - 0.5) * 0.05;
  newWeights.systemPromptWeight += (avgScore - 0.5) * 0.03;
  newWeights.routineAdherence += (goalCompleteRate - 0.5) * 0.04;

  if (avgSessionLength > 60000) {
    newWeights.responseStyle = Math.min(1, newWeights.responseStyle + 0.01);
  } else if (avgSessionLength < 10000) {
    newWeights.responseStyle = Math.max(0, newWeights.responseStyle - 0.01);
  }

  newWeights.moodEnergy = Math.max(0, Math.min(1, newWeights.moodEnergy));
  newWeights.proactivity = Math.max(0, Math.min(1, newWeights.proactivity));
  newWeights.systemPromptWeight = Math.max(0, Math.min(1, newWeights.systemPromptWeight));
  newWeights.routineAdherence = Math.max(0, Math.min(1, newWeights.routineAdherence));
  newWeights.responseStyle = Math.max(0, Math.min(1, newWeights.responseStyle));

  return newWeights;
}

export function selectPromptVariant(state: { bandits: BanditArm[] }): string {
  const totalPulls = state.bandits.reduce((s, b) => s + b.pulls, 0);

  if (totalPulls > 10) {
    const means = state.bandits.map((b) => (b.pulls > 0 ? b.rewards / b.pulls : 0));
    const sorted = means.slice().sort((a, b) => b - a);
    if (sorted[0] - sorted[1] > 0.4) {
      return state.bandits[means.indexOf(sorted[0])].name;
    }
  }

  if (totalPulls === 0 || Math.random() < EPSILON) {
    return state.bandits[Math.floor(Math.random() * state.bandits.length)].name;
  }

  let bestArm = state.bandits[0];
  let bestScore = -Infinity;

  for (const arm of state.bandits) {
    const confidence = Math.sqrt(2 * Math.log(Math.max(1, totalPulls)) / Math.max(1, arm.pulls));
    const score = arm.pulls > 0 ? arm.rewards / arm.pulls + confidence : 1.0;
    if (score > bestScore) {
      bestScore = score;
      bestArm = arm;
    }
  }

  return bestArm.name;
}

export function updateBandit(state: { bandits: BanditArm[] }, variant: string, reward: number): void {
  const arm = state.bandits.find((b) => b.name === variant);
  if (arm) {
    arm.pulls++;
    arm.rewards += reward;
  }
}

export function decayWeights(state: { weights: AdaptationWeights }): void {
  state.weights.moodEnergy *= META_WEIGHT_DECAY;
  state.weights.proactivity *= META_WEIGHT_DECAY;
  state.weights.systemPromptWeight *= META_WEIGHT_DECAY;
  state.weights.routineAdherence *= META_WEIGHT_DECAY;
  state.weights.responseStyle *= META_WEIGHT_DECAY;
}

export interface AdaptationReport {
  weights: AdaptationWeights;
  variantSelected: string;
  avgScore: number;
  goalCompleteRate: number;
  totalInteractions: number;
  sessionCount: number;
  lastAdaptationTs: number;
}

export function generateReport(
  state: {
    weights: AdaptationWeights;
    bandits: BanditArm[];
    feedbackLog: FeedbackEntry[];
    sessionCount: number;
    totalInteractions: number;
    lastAdaptationTs: number;
  },
): AdaptationReport {
  const recent = state.feedbackLog.slice(-50);
  const avgScore = recent.length > 0 ? recent.reduce((s, f) => s + f.score, 0) / recent.length : 0;
  const goalAttempts = recent.filter((f) => f.signal.type === "goal_complete" || f.signal.type === "goal_fail");
  const goalCompleteRate = goalAttempts.length > 0
    ? recent.filter((f) => f.signal.type === "goal_complete").length / goalAttempts.length
    : 0;

  const totalPulls = state.bandits.reduce((s, b) => s + b.pulls, 0);
  const variantSelected = totalPulls > 0
    ? state.bandits.reduce((best, b) => (b.pulls > 0 && b.rewards / b.pulls > best.rewards / Math.max(1, best.pulls) ? b : best), state.bandits[0]).name
    : "casual";

  return {
    weights: state.weights,
    variantSelected,
    avgScore,
    goalCompleteRate,
    totalInteractions: state.totalInteractions,
    sessionCount: state.sessionCount,
    lastAdaptationTs: state.lastAdaptationTs,
  };
}

export function persistState<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
}

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
