// Hub Growth System — the home base grows as you explore and help NPCs.
// Inspired by Monster World File City restoration.

import type { NPCDef } from './eventEngine.ts';
import { NPC_DEFS } from './eventEngine.ts';

export interface HubState {
  level: number;
  xp: number;
  xpToNext: number;
  unlockedServices: string[];
  visitingNPCs: string[];
  completedQuests: string[];
  decorations: string[];
  lastVisitTs: number;
  visitorsToday: string[];
}

export interface HubService {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredLevel: number;
  requiredNPC?: string;
  effect: (state: HubState) => Partial<HubState>;
}

export interface HubQuest {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredLevel: number;
  requiredNPC?: string;
  requiredExploration?: number;
  reward: { type: 'service' | 'decoration' | 'npc' | 'xp'; refId?: string; amount?: number };
}

export const HUB_SERVICES: HubService[] = [
  {
    id: 'shop',
    name: 'Rin\'s Shoppe',
    description: 'Buy items and sell treasures.',
    icon: '🏪',
    requiredLevel: 1,
    requiredNPC: 'merchant_rin',
    effect: () => ({ unlockedServices: ['shop'] }),
  },
  {
    id: 'training_ground',
    name: 'Training Ground',
    description: 'Train your pet to gain XP and care points.',
    icon: '⚔️',
    requiredLevel: 2,
    effect: () => ({ unlockedServices: ['training_ground'] }),
  },
  {
    id: 'inn',
    name: 'Cozy Inn',
    description: 'Rest and restore SP. Skip time to next day.',
    icon: '🏠',
    requiredLevel: 3,
    requiredNPC: 'healer_momo',
    effect: () => ({ unlockedServices: ['inn'] }),
  },
  {
    id: 'hospital',
    name: 'Pet Hospital',
    description: 'Heal your pet and cure status effects.',
    icon: '🏥',
    requiredLevel: 4,
    requiredNPC: 'healer_momo',
    effect: () => ({ unlockedServices: ['hospital'] }),
  },
  {
    id: 'hacker_terminal',
    name: 'Hacker Terminal',
    description: 'Access hidden areas and unlock secret content.',
    icon: '💻',
    requiredLevel: 6,
    requiredNPC: 'hacker_vee',
    effect: () => ({ unlockedServices: ['hacker_terminal'] }),
  },
  {
    id: 'explorer_guild',
    name: 'Explorer Guild',
    description: 'Accept quests and claim rewards.',
    icon: '🗺️',
    requiredLevel: 5,
    requiredNPC: 'explorer_jax',
    effect: () => ({ unlockedServices: ['explorer_guild'] }),
  },
];

export const HUB_QUESTS: HubQuest[] = [
  {
    id: 'welcome_to_hub',
    title: 'Welcome to the Hub',
    description: 'Explore the Home Forest and return.',
    icon: '🌲',
    requiredLevel: 1,
    reward: { type: 'xp', amount: 50 },
  },
  {
    id: 'first_befriend',
    title: 'Making Friends',
    description: 'Befriend a wild monster.',
    icon: '🤝',
    requiredLevel: 2,
    reward: { type: 'decoration', refId: 'friendship_statue' },
  },
  {
    id: 'help_rin',
    title: 'Rin\'s Request',
    description: 'Help Rin find a Token Leaf.',
    icon: '📜',
    requiredLevel: 2,
    requiredNPC: 'merchant_rin',
    reward: { type: 'service', refId: 'shop' },
  },
  {
    id: 'help_kai',
    title: 'Kai\'s Manual',
    description: 'Retrieve Kai\'s Training Manual from the Bug Dungeon.',
    icon: '📖',
    requiredLevel: 4,
    requiredNPC: 'trainer_kai',
    reward: { type: 'decoration', refId: 'training_dummy' },
  },
  {
    id: 'help_momo',
    title: 'Moon Flowers',
    description: 'Find Moon Flowers for Momo\'s medicine.',
    icon: '🌸',
    requiredLevel: 6,
    requiredNPC: 'healer_momo',
    reward: { type: 'service', refId: 'hospital' },
  },
  {
    id: 'help_jax',
    title: 'Jax\'s Compass',
    description: 'Find a Storm Crystal for Jax\'s compass.',
    icon: '🧭',
    requiredLevel: 8,
    requiredNPC: 'explorer_jax',
    reward: { type: 'service', refId: 'explorer_guild' },
  },
  {
    id: 'help_vee',
    title: 'Debug the Void',
    description: 'Help Vee fix the Void Sea glitch.',
    icon: '💻',
    requiredLevel: 10,
    requiredNPC: 'hacker_vee',
    reward: { type: 'service', refId: 'hacker_terminal' },
  },
];

export const HUB_DECORATIONS: Record<string, { name: string; icon: string; description: string }> = {
  friendship_statue: { name: 'Friendship Statue', icon: '🗿', description: 'A statue of your pet and its first friend.' },
  training_dummy: { name: 'Training Dummy', icon: '🥊', description: 'A practice dummy for battle training.' },
  token_fountain: { name: 'Token Fountain', icon: '⛲', description: 'A fountain that grants small XP daily.' },
  crystal_garden: { name: 'Crystal Garden', icon: '🌺', description: 'Beautiful crystals that grow over time.' },
  neon_sign: { name: 'Neon Sign', icon: '🔆', description: 'A shiny neon sign from the Neon Circuit.' },
  void_altar: { name: 'Void Altar', icon: '🕯️', description: 'A mysterious altar from the Void Sea.' },
};

export function createInitialHubState(): HubState {
  return {
    level: 1,
    xp: 0,
    xpToNext: 100,
    unlockedServices: [],
    visitingNPCs: [],
    completedQuests: [],
    decorations: [],
    lastVisitTs: Date.now(),
    visitorsToday: [],
  };
}

export function tickHub(state: HubState, now = Date.now()): HubState {
  const hoursSinceVisit = (now - state.lastVisitTs) / (1000 * 60 * 60);
  let xpGain = 0;

  // Daily visit bonus
  const today = new Date().toDateString();
  const lastVisitDay = new Date(state.lastVisitTs).toDateString();
  if (today !== lastVisitDay) {
    xpGain += 10; // daily visit bonus
  }

  // Decorations generate passive XP
  xpGain += state.decorations.length * 2;

  const newXp = state.xp + xpGain;
  let level = state.level;
  let xpRemaining = newXp;

  while (xpRemaining >= state.xpToNext) {
    xpRemaining -= state.xpToNext;
    level += 1;
  }

  return {
    ...state,
    xp: xpRemaining,
    level,
    xpToNext: 100 + (level - 1) * 50,
    lastVisitTs: now,
    visitorsToday: hoursSinceVisit >= 24 ? [] : state.visitorsToday,
  };
}

export function completeHubQuest(state: HubState, questId: string, reward: { type: string; refId?: string; amount?: number }): HubState {
  if (state.completedQuests.includes(questId)) return state;

  const updated: HubState = {
    ...state,
    completedQuests: [...state.completedQuests, questId],
    xp: state.xp + (reward.type === 'xp' ? (reward.amount || 0) : 20),
    visitingNPCs: state.visitingNPCs,
    unlockedServices: reward.type === 'service' && reward.refId && !state.unlockedServices.includes(reward.refId)
      ? [...state.unlockedServices, reward.refId]
      : state.unlockedServices,
    decorations: reward.type === 'decoration' && reward.refId && !state.decorations.includes(reward.refId)
      ? [...state.decorations, reward.refId]
      : state.decorations,
  };

  return updated;
}

export function npcVisit(state: HubState, npcId: string): HubState {
  if (state.visitingNPCs.includes(npcId)) return state;
  if (state.visitorsToday.includes(npcId)) return state;

  return {
    ...state,
    visitingNPCs: [...state.visitingNPCs, npcId],
    visitorsToday: [...state.visitorsToday, npcId],
    xp: state.xp + 5,
  };
}

export function npcLeave(state: HubState, npcId: string): HubState {
  return {
    ...state,
    visitingNPCs: state.visitingNPCs.filter((id) => id !== npcId),
  };
}

export function getAvailableQuests(state: HubState, explorationCount: number): HubQuest[] {
  return HUB_QUESTS.filter((q) => {
    if (state.level < q.requiredLevel) return false;
    if (state.completedQuests.includes(q.id)) return false;
    if (q.requiredNPC && !state.visitingNPCs.includes(q.requiredNPC) && !state.unlockedServices.includes(q.requiredNPC)) return false;
    if (q.requiredExploration && explorationCount < q.requiredExploration) return false;
    return true;
  });
}

export function getAvailableServices(state: HubState): HubService[] {
  return HUB_SERVICES.filter((s) => {
    if (state.unlockedServices.includes(s.id)) return false;
    if (state.level < s.requiredLevel) return false;
    if (s.requiredNPC && !state.visitingNPCs.includes(s.requiredNPC)) return false;
    return true;
  });
}

export function getVisitorNPCs(state: HubState): NPCDef[] {
  return NPC_DEFS.filter((npc) => state.visitingNPCs.includes(npc.id));
}

export function calculateHubScore(state: HubState): number {
  return (
    state.level * 10 +
    state.unlockedServices.length * 15 +
    state.decorations.length * 10 +
    state.completedQuests.length * 5 +
    state.visitingNPCs.length * 5
  );
}
