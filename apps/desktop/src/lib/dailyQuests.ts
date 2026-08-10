// Daily Quests — rotating quests that refresh every day with rewards.

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  rewardType: 'xp' | 'currency' | 'item';
  rewardAmount: number;
  rewardItemId?: string;
  claimed: boolean;
  date: string;
}

export interface DailyQuestDef {
  id: string;
  title: string;
  description: string;
  maxProgress: number;
  rewardType: 'xp' | 'currency' | 'item';
  rewardAmount: number;
  rewardItemId?: string;
  condition: (state: any) => boolean;
  onProgress: (state: any) => number;
}

export const DAILY_QUEST_DEFS: DailyQuestDef[] = [
  {
    id: 'daily_chat',
    title: 'Social Butterfly',
    description: 'Send 5 chat messages today',
    maxProgress: 5,
    rewardType: 'xp',
    rewardAmount: 50,
    condition: () => true,
    onProgress: (state) => Math.min(state._totalMessages || 0, 5),
  },
  {
    id: 'daily_explore',
    title: 'Explorer',
    description: 'Explore 2 new areas today',
    maxProgress: 2,
    rewardType: 'currency',
    rewardAmount: 100,
    condition: () => true,
    onProgress: (state) => Math.min(state.world?.visitedAreas?.length || 0, 2),
  },
  {
    id: 'daily_care',
    title: 'Pet Care',
    description: 'Perform 3 care actions (feed/play/clean/sleep)',
    maxProgress: 3,
    rewardType: 'xp',
    rewardAmount: 30,
    condition: () => true,
    onProgress: () => 0,
  },
  {
    id: 'daily_craft',
    title: 'Crafter',
    description: 'Craft 1 item today',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 50,
    condition: () => true,
    onProgress: (state) => Math.min(state.items?.length || 0, 1),
  },
  {
    id: 'daily_battle',
    title: 'Warrior',
    description: 'Win 2 encounters in the world',
    maxProgress: 2,
    rewardType: 'xp',
    rewardAmount: 40,
    condition: () => true,
    onProgress: () => 0,
  },
  {
    id: 'daily_shop',
    title: 'Shopper',
    description: 'Buy 1 item from the shop',
    maxProgress: 1,
    rewardType: 'currency',
    rewardAmount: 25,
    condition: () => true,
    onProgress: (state) => Math.min(state.items?.length || 0, 1),
  },
];

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function createDailyQuests(): DailyQuest[] {
  const today = getTodayDate();
  const shuffled = [...DAILY_QUEST_DEFS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  return selected.map(def => ({
    id: def.id,
    title: def.title,
    description: def.description,
    progress: 0,
    maxProgress: def.maxProgress,
    completed: false,
    rewardType: def.rewardType,
    rewardAmount: def.rewardAmount,
    rewardItemId: def.rewardItemId,
    claimed: false,
    date: today,
  }));
}

export function getDailyQuests(state: any): DailyQuest[] {
  const today = getTodayDate();
  const quests = state.dailyQuests || [];
  const needsRefresh = quests.length === 0 || quests[0]?.date !== today;
  if (needsRefresh) {
    return createDailyQuests();
  }
  return quests;
}

export function updateDailyQuestProgress(state: any, questId: string, increment: number = 1): any {
  const quests = getDailyQuests(state);
  const updated = quests.map((q: DailyQuest) => {
    if (q.id !== questId || q.completed) return q;
    const newProgress = Math.min(q.progress + increment, q.maxProgress);
    return {
      ...q,
      progress: newProgress,
      completed: newProgress >= q.maxProgress,
    };
  });
  return { ...state, dailyQuests: updated };
}

export function claimDailyQuestReward(state: any, questId: string): any {
  const quests = getDailyQuests(state);
  const quest = quests.find((q: DailyQuest) => q.id === questId);
  if (!quest || !quest.completed || quest.claimed) return state;

  const updated = quests.map((q: DailyQuest) =>
    q.id === questId ? { ...q, claimed: true } : q
  );

  const newState = { ...state, dailyQuests: updated };
  return newState;
}

export function getCompletedDailyQuests(state: any): DailyQuest[] {
  return getDailyQuests(state).filter((q: DailyQuest) => q.completed);
}

export function getClaimableDailyQuests(state: any): DailyQuest[] {
  return getDailyQuests(state).filter((q: DailyQuest) => q.completed && !q.claimed);
}
