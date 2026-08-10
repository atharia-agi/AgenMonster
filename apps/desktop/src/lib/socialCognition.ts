// socialCognition — Theory of Mind. The creature models the goals, knowledge,
// trust, and emotional state of other agents/stakeholders, and tailors plans
// and messages per role (investor ≠ developer ≠ end-user). Pure + testable.

export type StakeholderRole = 'user' | 'developer' | 'investor' | 'end_user' | 'critic';

export interface StakeholderModel {
  role: StakeholderRole;
  goals: string[];
  knowledgeLevel: number; // 0..1
  trust: number; // 0..1
  emotionalState: 'positive' | 'neutral' | 'negative';
}

export function modelStakeholder(role: StakeholderRole): StakeholderModel {
  const base: Record<StakeholderRole, StakeholderModel> = {
    user: { role: 'user', goals: ['be helped', 'learn'], knowledgeLevel: 0.6, trust: 0.8, emotionalState: 'positive' },
    developer: { role: 'developer', goals: ['ship code', 'maintain quality'], knowledgeLevel: 0.9, trust: 0.7, emotionalState: 'neutral' },
    investor: { role: 'investor', goals: ['growth', 'ROI'], knowledgeLevel: 0.4, trust: 0.5, emotionalState: 'neutral' },
    end_user: { role: 'end_user', goals: ['easy experience'], knowledgeLevel: 0.3, trust: 0.6, emotionalState: 'neutral' },
    critic: { role: 'critic', goals: ['find flaws'], knowledgeLevel: 0.8, trust: 0.4, emotionalState: 'negative' },
  };
  return base[role];
}

/** Tailor a plan/message to a stakeholder's model. */
export function tailorFor(role: StakeholderRole, content: string): { role: StakeholderRole; adapted: string; tone: string } {
  const m = modelStakeholder(role);
  let tone = 'neutral';
  if (m.knowledgeLevel < 0.5) tone = 'simple';
  else if (m.trust < 0.5) tone = 'evidence-heavy';
  else if (m.emotionalState === 'negative') tone = 'reassuring';
  return { role, adapted: content, tone };
}

/** Blend multiple stakeholder priorities into a single decision weight. */
export function stakeholderWeight(models: StakeholderModel[]): number {
  if (!models.length) return 0.5;
  return models.reduce((a, m) => a + m.trust * m.knowledgeLevel, 0) / models.length;
}
