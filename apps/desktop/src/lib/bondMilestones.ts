export interface BondMilestone {
  friendshipThreshold: number;
  title: string;
  description: string;
  reward?: { type: string; refId?: string };
}

export interface NPCBondState {
  npcId: string;
  friendship: number;
  unlockedMilestones: number[];
}

export const BOND_MILESTONES: Record<string, BondMilestone[]> = {
  merchant_rin: [
    { friendshipThreshold: 5, title: 'Rin: Trust Building', description: 'Rin starts sharing map secrets with you.' },
    { friendshipThreshold: 10, title: 'Rin: Shoppe Opened', description: 'Rin opens her exclusive shoppe for you.', reward: { type: 'unlock_service', refId: 'rin_shoppe' } },
    { friendshipThreshold: 15, title: 'Rin: Map Master', description: 'Rin teaches you fast travel between areas.', reward: { type: 'unlock_area', refId: 'fast_travel' } },
    { friendshipThreshold: 20, title: 'Rin: Best Friends', description: 'Rin gives you a rare crafting blueprint.', reward: { type: 'item', refId: 'blueprint_rare' } },
    { friendshipThreshold: 25, title: 'Rin: Partner', description: 'Rin joins you on expeditions as a permanent companion.' },
    { friendshipThreshold: 30, title: 'Rin: Soul Bond', description: 'You and Rin share a deep bond. She reveals the ancient map to the legendary artifact.' },
  ],
  trainer_kai: [
    { friendshipThreshold: 5, title: 'Kai: Training Partner', description: 'Kai starts training your pet personally.' },
    { friendshipThreshold: 10, title: 'Kai: Combo Move', description: 'Kai teaches your pet a powerful combo move.', reward: { type: 'skill', refId: 'kai_combo' } },
    { friendshipThreshold: 15, title: 'Kai: Advanced Training', description: 'Kai unlocks advanced training exercises.', reward: { type: 'unlock_service', refId: 'kai_gym' } },
    { friendshipThreshold: 20, title: 'Kai: Master Student', description: 'Kai promotes your pet to advanced rank.' },
    { friendshipThreshold: 25, title: 'Kai: Sparring Partner', description: 'Kai visits the hub for weekly sparring sessions.' },
    { friendshipThreshold: 30, title: 'Kai: Legendary Bond', description: 'Kai entrusts your pet with his legendary training manual.', reward: { type: 'item', refId: 'legendary_manual' } },
  ],
  healer_momo: [
    { friendshipThreshold: 5, title: 'Momo: Trust Building', description: 'Momo starts sharing herbal remedies with you.' },
    { friendshipThreshold: 10, title: 'Momo: Free Heals', description: 'Momo provides free healing services.', reward: { type: 'skill', refId: 'momo_heal' } },
    { friendshipThreshold: 15, title: 'Momo: Medicine Maker', description: 'Momo teaches you to craft medicines.', reward: { type: 'unlock_service', refId: 'momo_lab' } },
    { friendshipThreshold: 20, title: 'Momo: Best Friends', description: 'Momo gives you a permanent healing buff.' },
    { friendshipThreshold: 25, title: 'Momo: Clinic Partner', description: 'Momo opens a clinic in the hub for you.' },
    { friendshipThreshold: 30, title: 'Momo: Soul Healer', description: 'Momo shares the legendary healing technique.', reward: { type: 'item', refId: 'soul_heal' } },
  ],
  explorer_jax: [
    { friendshipThreshold: 5, title: 'Jax: Trust Building', description: 'Jax starts sharing exploration tips with you.' },
    { friendshipThreshold: 10, title: 'Jax: Shortcut Revealed', description: 'Jax shows you a hidden shortcut.', reward: { type: 'unlock_area', refId: 'hidden_path' } },
    { friendshipThreshold: 15, title: 'Jax: Gear Master', description: 'Jax teaches you advanced navigation techniques.', reward: { type: 'skill', refId: 'jax_nav' } },
    { friendshipThreshold: 20, title: 'Jax: Best Friends', description: 'Jax gives you a rare exploration compass.' },
    { friendshipThreshold: 25, title: 'Jax: Expedition Leader', description: 'Jax leads you on exclusive expeditions.' },
    { friendshipThreshold: 30, title: 'Jax: Legendary Explorer', description: 'Jax reveals the location of a legendary artifact.', reward: { type: 'item', refId: 'legendary_compass' } },
  ],
  hacker_vee: [
    { friendshipThreshold: 5, title: 'Vee: Trust Building', description: 'Vee starts sharing hacking tips with you.' },
    { friendshipThreshold: 10, title: 'Vee: Circuit Hacker', description: 'Vee teaches you basic circuit hacking.', reward: { type: 'skill', refId: 'circuit_hack' } },
    { friendshipThreshold: 15, title: 'Vee: Neon Insider', description: 'Vee gives you access to exclusive Neon Circuit events.' },
    { friendshipThreshold: 20, title: 'Vee: Tech Guru', description: 'Vee mentors you in advanced tech skills.' },
    { friendshipThreshold: 25, title: 'Vee: Neon Legend', description: 'Vee introduces you to the Neon Circuit\'s legendary coders.' },
    { friendshipThreshold: 30, title: 'Vee: Soul Circuit', description: 'Vee merges her neural link with yours, sharing infinite knowledge.', reward: { type: 'item', refId: 'neural_link' } },
  ],
};

export function getBondMilestonesForNPC(npcId: string): BondMilestone[] {
  return BOND_MILESTONES[npcId] ?? [];
}

export function getNextBondMilestone(npcId: string, friendship: number): BondMilestone | null {
  const milestones = getBondMilestonesForNPC(npcId);
  return milestones.find(m => m.friendshipThreshold > friendship) ?? null;
}

export function getUnlockedBondMilestones(npcId: string, friendship: number): BondMilestone[] {
  const milestones = getBondMilestonesForNPC(npcId);
  return milestones.filter(m => m.friendshipThreshold <= friendship);
}
