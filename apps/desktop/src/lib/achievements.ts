// Achievements — milestones for story, exploration, crafting, and pet care.

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'story' | 'exploration' | 'crafting' | 'pet_care' | 'milestone';
}

export interface AchievementProgress {
  id: string;
  earned: boolean;
  earnedAt?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Story achievements
  { id: 'first_story', title: 'First Story', description: 'Complete your first story event', icon: '📖', color: '#88ccf0', category: 'story' },
  { id: 'story_explorer', title: 'Story Explorer', description: 'Complete 3 story chains', icon: '🗺️', color: '#90c878', category: 'story' },
  { id: 'legend_hunter', title: 'Legend Hunter', description: 'Encounter a legendary monster', icon: '🌟', color: '#a080e0', category: 'story' },
  { id: 'chain_master', title: 'Chain Master', description: 'Complete a 2-step story chain', icon: '⛓️', color: '#f0b040', category: 'story' },
  // Exploration achievements
  { id: 'first_travel', title: 'First Steps', description: 'Travel to a new area', icon: '👣', color: '#88ccf0', category: 'exploration' },
  { id: 'area_hopper', title: 'Area Hopper', description: 'Visit 3 different areas', icon: '🌍', color: '#90c878', category: 'exploration' },
  { id: 'void_diver', title: 'Void Diver', description: 'Reach the Void Sea', icon: '🌑', color: '#a080e0', category: 'exploration' },
  { id: 'weather_watcher', title: 'Weather Watcher', description: 'Experience 3 different weathers', icon: '🌦️', color: '#f0b040', category: 'exploration' },
  // Crafting achievements
  { id: 'first_craft', title: 'First Craft', description: 'Craft your first item', icon: '🔨', color: '#88ccf0', category: 'crafting' },
  { id: 'master_crafter', title: 'Master Crafter', description: 'Craft 5 different items', icon: '⚒️', color: '#90c878', category: 'crafting' },
  { id: 'material_hunter', title: 'Material Hunter', description: 'Collect 10 items', icon: '🎒', color: '#f0b040', category: 'crafting' },
  // Pet care achievements
  { id: 'first_feed', title: 'First Meal', description: 'Feed your pet', icon: '🍖', color: '#88ccf0', category: 'pet_care' },
  { id: 'caretaker', title: 'Caretaker', description: 'Use all care actions', icon: '💝', color: '#90c878', category: 'pet_care' },
  { id: 'mood_booster', title: 'Mood Booster', description: 'Keep pet mood above 80', icon: '😊', color: '#f0b040', category: 'pet_care' },
  // Milestone achievements
  { id: 'level_5', title: 'Growing Up', description: 'Reach level 5', icon: '⭐', color: '#88ccf0', category: 'milestone' },
  { id: 'level_10', title: 'Rising Star', description: 'Reach level 10', icon: '⭐⭐', color: '#90c878', category: 'milestone' },
  { id: 'first_evolution', title: 'First Evolution', description: 'Evolve your pet', icon: '✨', color: '#a080e0', category: 'milestone' },
  { id: 'shop_owner', title: 'Shop Owner', description: 'Buy your first item', icon: '🛒', color: '#f0b040', category: 'milestone' },
  // Cross-area achievements
  { id: 'artifact_hunter', title: 'Artifact Hunter', description: 'Complete the Lost Artifact cross-area chain', icon: '🔮', color: '#a080e0', category: 'story' },
  { id: 'glitch_hero', title: 'Glitch Hero', description: 'Complete the Glitch Cure cross-area chain', icon: '📡', color: '#50b8a0', category: 'story' },
  { id: 'area_master', title: 'Area Master', description: 'Visit all 6 areas', icon: '🌍', color: '#90c878', category: 'exploration' },
];

export function getAchievementProgress(world: any, gameState: any): AchievementProgress[] {
  const earned = new Map<string, number>();

  const earnedSet = new Set<string>();
  const existing = Array.isArray(world?.achievements) ? world.achievements : [];
  for (const a of existing) {
    if (a.earned) earnedSet.add(a.id);
  }

  const add = (id: string) => {
    if (!earnedSet.has(id)) {
      earned.set(id, Date.now());
    }
  };

  const flags = world?.questFlags || {};
  const storyCount = Object.keys(flags).filter(k => k.includes('_completed') || k.includes('_resolved') || k.includes('_attended')).length;

  if (Object.keys(flags).length > 0) add('first_story');
  if (storyCount >= 3) add('story_explorer');
  if (flags.void_project_helped || flags.void_project_left) add('legend_hunter');
  if (flags.cloud_storm_completed || flags.bug_outbreak_resolved) add('chain_master');

  const visitedAreas = Array.isArray(world?.visitedAreas) ? world.visitedAreas : [];
  const unlockedAreas = Array.isArray(world?.unlockedAreas) ? world.unlockedAreas : [];
  if (visitedAreas.length > 1) add('first_travel');
  if (visitedAreas.length >= 3) add('area_hopper');
  if (visitedAreas.length >= 6) add('area_master');
  if (unlockedAreas.includes('void_sea')) add('void_diver');

  const eventsCompletedToday = Array.isArray(world?.eventsCompletedToday) ? world.eventsCompletedToday : [];
  const weathers = new Set(eventsCompletedToday);
  if (weathers.size >= 3) add('weather_watcher');

  const items = Array.isArray(gameState?.items) ? gameState.items : [];
  if (items.length > 0) add('first_craft');
  if (items.length >= 5) add('material_hunter');

  const needs = gameState?.needs || {};
  if (needs.hunger < 50) add('first_feed');

  const level = typeof gameState?.level === 'number' ? gameState.level : 0;
  if (level >= 5) add('level_5');
  if (level >= 10) add('level_10');
  if (gameState?.stage && gameState.stage !== 'egg' && gameState.stage !== 'hatchling') add('first_evolution');
  if ((gameState?.currency || 0) < 200) add('shop_owner');

  if (flags.lost_artifact_complete) add('artifact_hunter');
  if (flags.glitch_cure_complete) add('glitch_hero');

  const progress: AchievementProgress[] = [];
  for (const def of ACHIEVEMENTS) {
    const isEarned = earnedSet.has(def.id) || earned.has(def.id);
    progress.push({
      id: def.id,
      earned: isEarned,
      earnedAt: isEarned ? (earned.get(def.id) || Date.now()) : undefined,
    });
  }

  return progress;
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(category: string): AchievementDef[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}
