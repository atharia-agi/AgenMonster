export interface ComputeBudget {
  turns: number;
  depth: 'quick' | 'normal' | 'deep';
  tools: number;
  modelTier: 'fast' | 'standard' | 'strong';
  reason: string;
}

export interface TaskDifficulty {
  score: number;
  factors: {
    queryLength: number;
    toolComplexity: number;
    emotionalArousal: number;
    confidence: number;
    hasPlan: number;
  };
}

export function assessTaskDifficulty(
  queryLength: number,
  toolComplexity: number,
  emotionalArousal: number,
  confidence: number,
  hasPlan: number
): TaskDifficulty {
  const factors = {
    queryLength: Math.min(queryLength / 200, 1),
    toolComplexity: Math.min(toolComplexity / 5, 1),
    emotionalArousal: emotionalArousal,
    confidence: 1 - confidence,
    hasPlan: hasPlan ? 0.2 : 0.8,
  };

  const weights = {
    queryLength: 0.15,
    toolComplexity: 0.25,
    emotionalArousal: 0.2,
    confidence: 0.25,
    hasPlan: 0.15,
  };

  const score =
    factors.queryLength * weights.queryLength +
    factors.toolComplexity * weights.toolComplexity +
    factors.emotionalArousal * weights.emotionalArousal +
    factors.confidence * weights.confidence +
    factors.hasPlan * weights.hasPlan;

  return { score: Math.min(score, 1), factors };
}

export function allocateComputeBudget(
  difficulty: TaskDifficulty,
  maxBudget: ComputeBudget
): ComputeBudget {
  const { score } = difficulty;

  if (score < 0.3) {
    return {
      turns: Math.min(3, maxBudget.turns),
      depth: 'quick',
      tools: Math.min(2, maxBudget.tools),
      modelTier: 'fast',
      reason: 'low_difficulty',
    };
  }

  if (score < 0.7) {
    return {
      turns: Math.min(Math.floor(maxBudget.turns * 0.6), maxBudget.turns),
      depth: 'normal',
      tools: Math.min(Math.floor(maxBudget.tools * 0.7), maxBudget.tools),
      modelTier: 'standard',
      reason: 'medium_difficulty',
    };
  }

  return {
    turns: maxBudget.turns,
    depth: 'deep',
    tools: maxBudget.tools,
    modelTier: 'strong',
    reason: 'high_difficulty',
  };
}

export function getComputeBudgetForQuery(
  query: string,
  toolCount: number,
  emotionalArousal: number,
  confidence: number,
  hasPlan: number,
  maxTurns = 20,
  maxTools = 10
): ComputeBudget {
  const difficulty = assessTaskDifficulty(
    query.length,
    toolCount,
    emotionalArousal,
    confidence,
    hasPlan
  );

  return allocateComputeBudget(difficulty, {
    turns: maxTurns,
    depth: 'normal',
    tools: maxTools,
    modelTier: 'standard',
    reason: 'default',
  });
}

export function getUserComputeDirective(
  userMessage: string): 'quick' | 'normal' | 'deep' | null {
  const lower = userMessage.toLowerCase();
  if (lower.includes('/deep') || lower.includes('think deeply') || lower.includes('analyze thoroughly')) {
    return 'deep';
  }
  if (lower.includes('/quick') || lower.includes('quick answer') || lower.includes('short answer')) {
    return 'quick';
  }
  if (lower.includes('/think')) {
    return 'deep';
  }
  return null;
}
