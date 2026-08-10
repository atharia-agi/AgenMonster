// World Engine — persistent virtual world for the pet monster.
// Concepts: areas, time-of-day, weather, seasons, exploration state.
// Inspired by Monster Adventure world travel + random encounters.

export type AreaId = 'home_forest' | 'token_river' | 'bug_dungeon' | 'cloud_server' | 'neon_circuit' | 'void_sea';

export interface AreaDef {
  id: AreaId;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockLevel: number;
  encounterTable: EncounterEntry[];
  weatherChance: Partial<Record<Weather, number>>;
}

export interface EncounterEntry {
  type: 'event' | 'item' | 'npc' | 'danger';
  weight: number;
  refId: string;
}

export type Weather = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'starry' | 'glitch';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WorldState {
  currentArea: AreaId;
  unlockedAreas: AreaId[];
  visitedAreas: AreaId[];
  weather: Weather;
  season: Season;
  dayCount: number;
  lastTickTs: number;
  eventsCompletedToday: string[];
  activeEventId: string | null;
  explorationXp: number;
  questFlags: Record<string, number>;
  npcFriendship: Record<string, number>;
  npcMet: Record<string, boolean>;
  npcBondMilestones: Record<string, number[]>;
}

export const AREAS: Record<AreaId, AreaDef> = {
  home_forest: {
    id: 'home_forest',
    name: 'Home Forest',
    description: 'A cozy pixel forest where your pet was born. Safe, calm, and full of memories.',
    icon: '🌲',
    color: '#50b8a0',
    unlockLevel: 1,
    encounterTable: [
      { type: 'event', weight: 4, refId: 'forest_butterfly' },
      { type: 'item', weight: 3, refId: 'token_leaf' },
      { type: 'npc', weight: 2, refId: 'wandering_sprite' },
      { type: 'danger', weight: 1, refId: 'mud_puddle' },
    ],
    weatherChance: { clear: 0.6, rain: 0.25, fog: 0.15 },
  },
  token_river: {
    id: 'token_river',
    name: 'Token River',
    description: 'A shimmering data stream. Fast currents carry rare tokens downstream.',
    icon: '🌊',
    color: '#60a8e8',
    unlockLevel: 3,
    encounterTable: [
      { type: 'event', weight: 3, refId: 'river_spirit' },
      { type: 'item', weight: 5, refId: 'rare_token' },
      { type: 'npc', weight: 2, refId: 'otter_coder' },
      { type: 'danger', weight: 2, refId: 'overflow_dam' },
    ],
    weatherChance: { clear: 0.5, rain: 0.3, storm: 0.2 },
  },
  bug_dungeon: {
    id: 'bug_dungeon',
    name: 'Bug Dungeon',
    description: 'Dark corridors of failed builds. Rewards are high, but so are the errors.',
    icon: '🏚️',
    color: '#e8607c',
    unlockLevel: 5,
    encounterTable: [
      { type: 'event', weight: 3, refId: 'ghost_stack' },
      { type: 'item', weight: 3, refId: 'debug_gem' },
      { type: 'npc', weight: 1, refId: 'minotaur_linter' },
      { type: 'danger', weight: 5, refId: 'infinite_loop' },
    ],
    weatherChance: { clear: 0.2, fog: 0.4, glitch: 0.3, storm: 0.1 },
  },
  cloud_server: {
    id: 'cloud_server',
    name: 'Cloud Server',
    description: 'Floating server racks in the sky. Uptime is sacred here.',
    icon: '☁️',
    color: '#a080e0',
    unlockLevel: 7,
    encounterTable: [
      { type: 'event', weight: 4, refId: 'deployment_celebration' },
      { type: 'item', weight: 3, refId: 'uptime_crystal' },
      { type: 'npc', weight: 2, refId: 'ops_wizard' },
      { type: 'danger', weight: 2, refId: 'outage_wraith' },
    ],
    weatherChance: { clear: 0.3, storm: 0.3, glitch: 0.2, snow: 0.2 },
  },
  neon_circuit: {
    id: 'neon_circuit',
    name: 'Neon Circuit',
    description: 'A cyberpunk data bazaar. Neon signs, hackable terminals, and midnight coders.',
    icon: '⚡',
    color: '#f0b040',
    unlockLevel: 9,
    encounterTable: [
      { type: 'event', weight: 3, refId: 'hacker_quest' },
      { type: 'item', weight: 4, refId: 'neon_chip' },
      { type: 'npc', weight: 3, refId: 'rogue_ai' },
      { type: 'danger', weight: 2, refId: 'firewall_hound' },
    ],
    weatherChance: { clear: 0.2, rain: 0.3, storm: 0.3, glitch: 0.2 },
  },
  void_sea: {
    id: 'void_sea',
    name: 'Void Sea',
    description: 'The edge of the known world. Abandoned projects drift here like shipwrecks.',
    icon: '🌑',
    color: '#8a7a9a',
    unlockLevel: 12,
    encounterTable: [
      { type: 'event', weight: 2, refId: 'abandoned_project' },
      { type: 'item', weight: 2, refId: 'void_artifact' },
      { type: 'npc', weight: 1, refId: 'lost_maintainer' },
      { type: 'danger', weight: 5, refId: 'memory_leak' },
    ],
    weatherChance: { clear: 0.1, storm: 0.2, glitch: 0.4, snow: 0.3 },
  },
};

export function getArea(areaId: AreaId): AreaDef {
  return AREAS[areaId];
}

export function getUnlockedAreas(level: number): AreaId[] {
  return Object.entries(AREAS)
    .filter(([, def]) => level >= def.unlockLevel)
    .map(([id]) => id as AreaId);
}

export function createInitialWorldState(): WorldState {
  const now = Date.now();
  return {
    currentArea: 'home_forest',
    unlockedAreas: ['home_forest'],
    visitedAreas: ['home_forest'],
    weather: 'clear',
    season: getCurrentSeason(),
    dayCount: 1,
    lastTickTs: now,
    eventsCompletedToday: [],
    activeEventId: null,
    explorationXp: 0,
    questFlags: {},
    npcFriendship: {},
    npcMet: {},
    npcBondMilestones: {},
  };
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function tickWorld(state: WorldState, now = Date.now()): WorldState {
  const hoursSinceLastTick = (now - state.lastTickTs) / (1000 * 60 * 60);
  let dayCount = state.dayCount;
  let weather = state.weather;

  if (hoursSinceLastTick >= 24) {
    dayCount += Math.floor(hoursSinceLastTick / 24);
    const area = AREAS[state.currentArea];
    if (area) {
      const chances = area.weatherChance;
      const roll = Math.random();
      let cumulative = 0;
      for (const [w, chance] of Object.entries(chances)) {
        cumulative += chance;
        if (roll <= cumulative) {
          weather = w as Weather;
          break;
        }
      }
    }
  }

  return {
    ...state,
    dayCount,
    weather,
    season: getCurrentSeason(),
    lastTickTs: now,
    eventsCompletedToday: hoursSinceLastTick >= 24 ? [] : state.eventsCompletedToday,
  };
}

export function travelTo(state: WorldState, areaId: AreaId): WorldState {
  if (!state.unlockedAreas.includes(areaId)) return state;
  return {
    ...state,
    currentArea: areaId,
    visitedAreas: state.visitedAreas.includes(areaId) ? state.visitedAreas : [...state.visitedAreas, areaId],
    activeEventId: null,
    lastTickTs: Date.now(),
  };
}

export function unlockArea(state: WorldState, areaId: AreaId): WorldState {
  if (state.unlockedAreas.includes(areaId)) return state;
  return {
    ...state,
    unlockedAreas: [...state.unlockedAreas, areaId],
  };
}

export function completeEvent(state: WorldState, eventId: string): WorldState {
  return {
    ...state,
    activeEventId: null,
    eventsCompletedToday: [...state.eventsCompletedToday, eventId],
    explorationXp: state.explorationXp + 10,
  };
}

export function rollEncounter(state: WorldState): { type: string; refId: string } | null {
  const area = AREAS[state.currentArea];
  if (!area || state.activeEventId) return null;

  const totalWeight = area.encounterTable.reduce((sum, e) => sum + e.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const entry of area.encounterTable) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      return { type: entry.type, refId: entry.refId };
    }
  }
  return null;
}
