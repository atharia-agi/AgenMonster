// Event Engine — random encounters, scripted story events, NPC interactions.
// Inspired by Monster Adventure visible encounters + Stardew scheduling.

import type { WorldState } from './worldEngine.ts';
import { getPersonalityDialogue } from './personality.ts';
import { getNextBondMilestone, getUnlockedBondMilestones } from './bondMilestones.ts';

// ===== EVENT TYPES =====
export type EventType = 'npc' | 'wild_monster' | 'environmental' | 'weather' | 'legendary' | 'story' | 'empty';

export interface EventDef {
  id: string;
  type: EventType;
  title: string;
  description: string;
  icon: string;
  choices?: EventChoice[];
  onComplete?: (state: WorldState) => Partial<WorldState>;
  requirements?: EventRequirement;
  cooldownHours?: number;
}

export interface EventChoice {
  label: string;
  consequence: string;
  effect: (state: WorldState) => Partial<WorldState>;
}

export interface EventRequirement {
  minLevel?: number;
  requiredForm?: string;
  requiredItem?: string;
  requiredFlags?: string[];
  requiredAreas?: string[];
  timeOfDay?: string[];
  weather?: string[];
  season?: string[];
}

export interface ActiveEvent {
  def: EventDef;
  spawnedAt: number;
  location: string;
  resolved: boolean;
}

// ===== NPC ENCOUNTERS =====
export interface NPCDef {
  id: string;
  name: string;
  sprite: string;
  homeArea: string;
  schedule: { hourStart: number; hourEnd: number; areas: string[] }[];
  dialogue: {
    first_meet: string;
    friendly: string;
    request?: string;
    thanks: string;
    leave: string;
  };
  request?: {
    itemId: string;
    reward: { type: 'item' | 'unlock_area' | 'unlock_service'; refId?: string };
  };
  friendship: number;
  hasShoppe?: boolean;
  shoppeItems?: string[];
}

// ===== WILD MONSTERS =====
export interface WildMonsterDef {
  id: string;
  name: string;
  sprite: string;
  form: string;
  level: number;
  behavior: 'passive' | 'neutral' | 'aggressive';
  habitat: string[];
  timeOfDay?: string[];
  weather?: string[];
  offerItem?: string;
  befriendThreshold: number;
  battleReward: { xp: number; item?: string };
}

// ===== ENVIRONMENTAL EVENTS =====
export interface EnvironmentalEventDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  durationMinutes: number;
  effect: (state: WorldState) => Partial<WorldState>;
}

// ===== LEGENDARY ENCOUNTERS =====
export interface LegendaryDef {
  id: string;
  name: string;
  sprite: string;
  title: string;
  description: string;
  condition: {
    minLevel?: number;
    requiredForm?: string;
    requiredTime?: string;
    requiredWeather?: string;
    requiredCompletedEvents?: string[];
  };
  reward: { type: 'item' | 'evolution_unlock' | 'unlock_area'; refId: string };
}

// ===== BUILT-IN CONTENT =====
export const NPC_DEFS: NPCDef[] = [
  {
    id: 'merchant_rin',
    name: 'Rin the Merchant',
    sprite: '🧑‍💼',
    homeArea: 'home_forest',
    schedule: [
      { hourStart: 8, hourEnd: 12, areas: ['home_forest', 'token_river'] },
      { hourStart: 14, hourEnd: 18, areas: ['home_forest', 'bug_dungeon'] },
    ],
    dialogue: {
      first_meet: 'Welcome, traveler! I trade rare items from across the digital world.',
      friendly: 'You and your partner are doing great! Here, a special discount.',
      request: 'Could you find me a Token Leaf from the river? I need it for my maps.',
      thanks: 'Thank you! This will help my maps. Take this Rare Token as payment.',
      leave: 'Safe travels! Come back anytime.',
    },
    friendship: 0,
    hasShoppe: true,
    shoppeItems: ['potion_hp', 'potion_sp', 'revive'],
  },
  {
    id: 'trainer_kai',
    name: 'Kai the Trainer',
    sprite: '🧑‍🏫',
    homeArea: 'home_forest',
    schedule: [
      { hourStart: 10, hourEnd: 14, areas: ['home_forest'] },
      { hourStart: 16, hourEnd: 19, areas: ['token_river', 'bug_dungeon'] },
    ],
    dialogue: {
      first_meet: 'Hey! Want to learn a new training technique?',
      friendly: 'Your pet has grown so strong! Let me teach you a combo move.',
      request: 'I lost my Training Manual in the Bug Dungeon. Can you retrieve it?',
      thanks: 'You found it! As thanks, I\'ll teach your pet a new skill.',
      leave: 'Practice makes perfect! See you around.',
    },
    friendship: 0,
    hasShoppe: false,
  },
  {
    id: 'healer_momo',
    name: 'Momo the Healer',
    sprite: '👩‍⚕️',
    homeArea: 'home_forest',
    schedule: [
      { hourStart: 9, hourEnd: 17, areas: ['home_forest'] },
    ],
    dialogue: {
      first_meet: 'Oh dear, is your partner hurt? Let me help.',
      friendly: 'You take such good care of your pet. Come back anytime.',
      request: 'I need Moon Flowers from the Cloud Server to make medicine.',
      thanks: 'These will help so many! Here\'s a free Healing Potion.',
      leave: 'Stay healthy, you two!',
    },
    friendship: 0,
    hasShoppe: false,
  },
  {
    id: 'explorer_jax',
    name: 'Jax the Explorer',
    sprite: '🧭',
    homeArea: 'token_river',
    schedule: [
      { hourStart: 6, hourEnd: 10, areas: ['home_forest', 'token_river'] },
      { hourStart: 15, hourEnd: 20, areas: ['cloud_server', 'neon_circuit'] },
    ],
    dialogue: {
      first_meet: 'Have you been to the Cloud Server? The view is incredible up there!',
      friendly: 'You\'re a true explorer now. Let me show you a shortcut.',
      request: 'I need a Storm Crystal from the Neon Circuit to calibrate my compass.',
      thanks: 'Perfect! This opens a hidden path in the Cloud Server for you.',
      leave: 'The world is vast — keep exploring!',
    },
    friendship: 0,
    hasShoppe: false,
  },
  {
    id: 'hacker_vee',
    name: 'Vee the Hacker',
    sprite: '💻',
    homeArea: 'neon_circuit',
    schedule: [
      { hourStart: 20, hourEnd: 24, areas: ['neon_circuit'] },
      { hourStart: 0, hourEnd: 4, areas: ['bug_dungeon', 'void_sea'] },
    ],
    dialogue: {
      first_meet: 'Psst... I can unlock hidden areas for a price. Or a favor.',
      friendly: 'You\'re cool. I\'ll give you free access to my terminal.',
      request: 'Help me debug the Void Sea glitch. Find a Memory Leak fragment.',
      thanks: 'You did it! The Void Sea is stable now. Access granted.',
      leave: 'Stay glitch-free.',
    },
    friendship: 0,
    hasShoppe: true,
    shoppeItems: ['glitch_key', 'data_map', 'memory_boost'],
  },
];

export const WILD_MONSTER: WildMonsterDef[] = [
  { id: 'koromon_wild', name: 'Koromon', sprite: '🐣', form: 'rookie', level: 2, behavior: 'passive', habitat: ['home_forest'], timeOfDay: ['morning', 'midday'], offerItem: 'token_leaf', befriendThreshold: 3, battleReward: { xp: 10, item: 'berry' } },
  { id: 'tsunomon_wild', name: 'Tsunomon', sprite: '🐹', form: 'rookie', level: 3, behavior: 'neutral', habitat: ['home_forest', 'token_river'], timeOfDay: ['afternoon', 'evening'], befriendThreshold: 5, battleReward: { xp: 15, item: 'token_leaf' } },
  { id: 'goblimon_wild', name: 'Goblimon', sprite: '👺', form: 'rookie', level: 5, behavior: 'aggressive', habitat: ['bug_dungeon'], befriendThreshold: 8, battleReward: { xp: 25, item: 'debug_gem' } },
  { id: 'otter_coder', name: 'Otter Coder', sprite: '🦦', form: 'champion', level: 8, behavior: 'neutral', habitat: ['token_river'], offerItem: 'rare_token', befriendThreshold: 10, battleReward: { xp: 40, item: 'rare_token' } },
  { id: 'wandering_sprite', name: 'Wandering Sprite', sprite: '🧚', form: 'champion', level: 10, behavior: 'passive', habitat: ['home_forest', 'cloud_server'], timeOfDay: ['night', 'late_night'], befriendThreshold: 12, battleReward: { xp: 50 } },
  { id: 'minotaur_linter', name: 'Minotaur Linter', sprite: '🐂', form: 'champion', level: 12, behavior: 'aggressive', habitat: ['bug_dungeon'], befriendThreshold: 15, battleReward: { xp: 60, item: 'debug_gem' } },
  { id: 'rogue_ai', name: 'Rogue AI', sprite: '🤖', form: 'ultimate', level: 15, behavior: 'aggressive', habitat: ['neon_circuit'], weather: ['storm', 'glitch'], befriendThreshold: 20, battleReward: { xp: 100, item: 'neon_chip' } },
  { id: 'lost_maintainer', name: 'Lost Maintainer', sprite: '👻', form: 'champion', level: 14, behavior: 'passive', habitat: ['void_sea'], timeOfDay: ['late_night'], befriendThreshold: 18, battleReward: { xp: 80, item: 'void_artifact' } },
];

export const ENVIRONMENTAL_EVENTS: EnvironmentalEventDef[] = [
  { id: 'sudden_rain', title: 'Sudden Rain', description: 'Dark clouds roll in. Rain starts pouring.', icon: '🌧️', durationMinutes: 30, effect: () => ({ weather: 'rain' as const }) },
  { id: 'fog_rolls_in', title: 'Fog Rolls In', description: 'Visibility drops. Something moves in the mist...', icon: '🌫️', durationMinutes: 45, effect: () => ({ weather: 'fog' as const }) },
  { id: 'glitch_wave', title: 'Glitch Wave', description: 'Reality flickers. The digital world destabilizes.', icon: '📡', durationMinutes: 20, effect: () => ({ weather: 'glitch' as const }) },
      { id: 'starfall', title: 'Starfarm', description: 'Data particles rain from above. Rare monsters may appear.', icon: '✨', durationMinutes: 15, effect: () => ({ weather: 'starry' as const }) },
  { id: 'bridge_collapse', title: 'Bridge Collapse', description: 'The old bridge gave way. Find another way across.', icon: '🌉', durationMinutes: 60, effect: () => ({}) },
  { id: 'token_rush', title: 'Token Rush', description: 'A surge of tokens flows downstream. Quick, grab some!', icon: '💎', durationMinutes: 10, effect: () => ({}) },
];

export const LEGENDARY_MONSTER: LegendaryDef[] = [
  {
    id: 'ancient_koromon',
    name: 'Ancient Koromon',
    sprite: '🌟',
    title: 'The First One',
    description: 'A glowing Koromon from the earliest days of the Digital World.',
    condition: { minLevel: 3, requiredTime: 'dawn', requiredWeather: 'clear' },
    reward: { type: 'evolution_unlock', refId: 'ancient_bloodline' },
  },
  {
    id: 'storm_lord',
    name: 'Storm Lord',
    sprite: '⚡',
    title: 'Wielder of the Tempest',
     description: 'A powerful monster that commands lightning and thunder.',
    condition: { minLevel: 10, requiredWeather: 'storm' },
    reward: { type: 'item', refId: 'storm_crystal' },
  },
  {
    id: 'void_walker',
    name: 'Void Walker',
    sprite: '👤',
    title: 'The Forgotten One',
    description: 'A shadowy figure from the abandoned projects of the Void Sea.',
    condition: { minLevel: 15, requiredForm: 'ultimate', requiredWeather: 'glitch' },
    reward: { type: 'unlock_area', refId: 'void_sanctum' },
  },
];

// ===== STORY EVENTS (scripted chains) =====
export const STORY_EVENTS: EventDef[] = [
  {
    id: 'first_encounter',
    type: 'story',
    title: 'A Voice in the Forest',
      description: 'You hear a faint cry. A small monster is trapped in a bush.',
    icon: '🌿',
    choices: [
      { label: 'Free it', consequence: 'The monster thanks you and joins the hub.', effect: () => ({}) },
      { label: 'Leave it', consequence: 'You walk away. The crying fades behind you.', effect: () => ({}) },
    ],
    requirements: { minLevel: 1 },
    cooldownHours: 48,
  },
  {
    id: 'merchant_rin_request',
    type: 'story',
    title: 'Rin\'s Request',
    description: 'Rin needs a Token Leaf from the river to complete her maps.',
    icon: '📜',
    choices: [
      { label: 'Help Rin', consequence: 'Rin thanks you and opens her shoppe.', effect: () => ({}) },
      { label: 'Decline', consequence: 'Rin looks disappointed but understands.', effect: () => ({}) },
    ],
    requirements: { minLevel: 2 },
    cooldownHours: 72,
  },
  {
    id: 'trainer_kai_request',
    type: 'story',
    title: 'Kai\'s Training Manual',
    description: 'Kai lost his Training Manual in the Bug Dungeon.',
    icon: '📖',
    choices: [
      { label: 'Retrieve it', consequence: 'Kai teaches your pet a new combo move.', effect: () => ({}) },
      { label: 'Too busy', consequence: 'Kai nods. "Maybe later."', effect: () => ({}) },
    ],
    requirements: { minLevel: 4 },
    cooldownHours: 72,
  },
  {
    id: 'cloud_server_unlock',
    type: 'story',
    title: 'Path to the Clouds',
    description: 'A wind spirit offers to carry you to the Cloud Server.',
    icon: '☁️',
    choices: [
      { label: 'Accept', consequence: 'The Cloud Server is now accessible!', effect: () => ({}) },
    ],
    requirements: { minLevel: 6 },
    cooldownHours: 0,
  },
  {
    id: 'neon_circuit_unlock',
    type: 'story',
    title: 'Neon Gateway',
    description: 'A rogue AI has opened a portal to the Neon Circuit.',
    icon: '⚡',
    choices: [
      { label: 'Enter', consequence: 'You step through the neon-lit gateway.', effect: () => ({}) },
    ],
    requirements: { minLevel: 8 },
    cooldownHours: 0,
  },
  {
    id: 'void_sea_unlock',
    type: 'story',
    title: 'The Edge of the World',
    description: 'The Void Sea calls. Only the strongest dare to enter.',
    icon: '🌑',
    choices: [
      { label: 'Dive in', consequence: 'The Void Sea is now open. Be careful.', effect: () => ({}) },
    ],
    requirements: { minLevel: 11 },
    cooldownHours: 0,
  },
  {
    id: 'lost_puppy_chain_1',
    type: 'story',
    title: 'A Lost Puppy',
      description: 'A small monster puppy is crying near the river. It seems lost.',
    icon: '🐶',
    choices: [
      { label: 'Comfort it', consequence: 'The puppy calms down. It points toward the Bug Dungeon.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_puppy_comforted: 1 } }) },
      { label: 'Ignore it', consequence: 'The puppy runs off into the woods.', effect: () => ({}) },
    ],
    requirements: { minLevel: 3 },
    cooldownHours: 24,
  },
  {
    id: 'lost_puppy_chain_2',
    type: 'story',
    title: 'Puppy\'s Home',
    description: 'You found the puppy\'s home in the Bug Dungeon! The family thanks you.',
    icon: '🏠',
    choices: [
      { label: 'Accept reward', consequence: 'The puppy\'s family gives you a rare item.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_puppy_reunited: 1 } }) },
    ],
    requirements: { minLevel: 3, requiredFlags: ['lost_puppy_comforted'] },
    cooldownHours: 48,
  },
  {
    id: 'data_corruption_chain_1',
    type: 'story',
    title: 'Glitch in the System',
    description: 'Data streams are flickering in the Neon Circuit. Something is corrupting them.',
    icon: '📡',
    choices: [
      { label: 'Investigate', consequence: 'You trace the glitch to the Void Sea.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_investigated: 1 } }) },
      { label: 'Report it', consequence: 'You alert the authorities. They handle it.', effect: () => ({}) },
    ],
    requirements: { minLevel: 8 },
    cooldownHours: 24,
  },
  {
    id: 'data_corruption_chain_2',
    type: 'story',
    title: 'Source of the Glitch',
    description: 'Deep in the Void Sea, you find the source: a rogue fragment trying to reconnect.',
    icon: '👾',
    choices: [
      { label: 'Help it reconnect', consequence: 'The fragment rejoins the network. The glitch fades.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_fixed: 1 } }) },
      { label: 'Delete it', consequence: 'You erase the fragment. The glitch stops, but something feels lost.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_deleted: 1 } }) },
    ],
    requirements: { minLevel: 10, requiredFlags: ['glitch_investigated'] },
    cooldownHours: 72,
  },
  {
    id: 'festival_prep_chain_1',
    type: 'story',
    title: 'Festival Preparations',
    description: 'The village is preparing for the annual Digital Festival. They need help!',
    icon: '🎉',
    choices: [
      { label: 'Help prepare', consequence: 'You volunteer to gather decorations from the forest.', effect: (state) => ({ questFlags: { ...state.questFlags, festival_prep_started: 1 } }) },
      { label: 'Skip it', consequence: 'You head off on your own adventure.', effect: () => ({}) },
    ],
    requirements: { minLevel: 5 },
    cooldownHours: 48,
  },
  {
    id: 'festival_prep_chain_2',
    type: 'story',
    title: 'Festival Setup',
    description: 'The decorations are ready. Now you need to help set up the stage in the Cloud Server.',
    icon: '🎪',
    choices: [
      { label: 'Help setup', consequence: 'The stage is ready! The festival will be amazing.', effect: (state) => ({ questFlags: { ...state.questFlags, festival_setup_complete: 1 } }) },
    ],
    requirements: { minLevel: 6, requiredFlags: ['festival_prep_started'] },
    cooldownHours: 48,
  },
  {
    id: 'festival_prep_chain_3',
    type: 'story',
    title: 'The Festival',
    description: 'The Digital Festival is tonight! Everyone is gathered, and there\'s a special surprise.',
    icon: '🎆',
    choices: [
      { label: 'Attend', consequence: 'You enjoy the festival. Your pet makes new friends!', effect: (state) => ({ questFlags: { ...state.questFlags, festival_attended: 1 } }) },
    ],
    requirements: { minLevel: 7, requiredFlags: ['festival_setup_complete'] },
    cooldownHours: 72,
  },
  // ===== AREA-SPECIFIC STORY CHAINS =====
  // Cloud Server — Wind Spirit's Storm
  {
    id: 'cloud_storm_chain_1',
    type: 'story',
    title: 'Wind Spirit\'s Plea',
    description: 'A wind spirit in the Cloud Server is distressed. A storm is coming and it cannot hold the clouds alone.',
    icon: '🌬️',
    choices: [
      { label: 'Help the spirit', consequence: 'You lend your energy to the spirit. The storm slows.', effect: (state) => ({ questFlags: { ...state.questFlags, cloud_storm_helped: 1 } }) },
      { label: 'Seek shelter', consequence: 'You wait out the storm in a nearby server room.', effect: () => ({}) },
    ],
    requirements: { minLevel: 6, requiredAreas: ['cloud_server'] },
    cooldownHours: 48,
  },
  {
    id: 'cloud_storm_chain_2',
    type: 'story',
    title: 'Calm After the Storm',
    description: 'The wind spirit thanks you with a rare Storm Crystal. The Cloud Server gleams under a rainbow.',
    icon: '🌈',
    choices: [
      { label: 'Accept the gift', consequence: 'You receive a Storm Crystal and +50 exploration XP.', effect: (state) => ({ questFlags: { ...state.questFlags, cloud_storm_completed: 1 }, explorationXp: state.explorationXp + 50 }) },
    ],
    requirements: { minLevel: 6, requiredFlags: ['cloud_storm_helped'] },
    cooldownHours: 72,
  },
  // Bug Dungeon — Containment Protocol
  {
    id: 'bug_outbreak_chain_1',
    type: 'story',
    title: 'Bug Outbreak',
    description: 'The Bug Dungeon is swarming with glitched bugs! The containment system is failing.',
    icon: '🐛',
    choices: [
      { label: 'Assist containment', consequence: 'You help quarantine the affected corridors.', effect: (state) => ({ questFlags: { ...state.questFlags, bug_outbreak_contained: 1 } }) },
      { label: 'Evacuate', consequence: 'You retreat to safety. The bugs will have to wait.', effect: () => ({}) },
    ],
    requirements: { minLevel: 7, requiredAreas: ['bug_dungeon'] },
    cooldownHours: 48,
  },
  {
    id: 'bug_outbreak_chain_2',
    type: 'story',
    title: 'Source of the Bugs',
    description: 'Deep in the dungeon, you find the root cause: a corrupted Debug Gem. Destroying it stops the outbreak.',
    icon: '💠',
    choices: [
      { label: 'Destroy the gem', consequence: 'The dungeon stabilizes. You earn a Debug Gem and +60 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, bug_outbreak_resolved: 1 }, explorationXp: state.explorationXp + 60 }) },
      { label: 'Study it', consequence: 'You learn from the corruption. The bugs remain, but you gain insight.', effect: (state) => ({ questFlags: { ...state.questFlags, bug_outbreak_studied: 1 }, explorationXp: state.explorationXp + 30 }) },
    ],
    requirements: { minLevel: 8, requiredFlags: ['bug_outbreak_contained'] },
    cooldownHours: 72,
  },
  // Neon Circuit — Ghost in the Machine
  {
    id: 'neon_glitch_chain_1',
    type: 'story',
    title: 'Ghost in the Machine',
    description: 'A rogue AI fragment is haunting the Neon Circuit, causing random glitches and blackouts.',
    icon: '👻',
    choices: [
      { label: 'Investigate', consequence: 'You trace the fragment to a forgotten server node.', effect: (state) => ({ questFlags: { ...state.questFlags, neon_glitch_traced: 1 } }) },
      { label: 'Ignore it', consequence: 'The glitches continue. Best not to interfere.', effect: () => ({}) },
    ],
    requirements: { minLevel: 9, requiredAreas: ['neon_circuit'] },
    cooldownHours: 48,
  },
  {
    id: 'neon_glitch_chain_2',
    type: 'story',
    title: 'Fragment\'s Request',
    description: 'The fragment is not evil — it\'s lost. It asks for a Neon Chip to restore its core.',
    icon: '⚡',
    choices: [
      { label: 'Give a Neon Chip', consequence: 'The fragment rejoins the network. You earn +40 XP and its gratitude.', effect: (state) => ({ questFlags: { ...state.questFlags, neon_glitch_helped: 1 }, explorationXp: state.explorationXp + 40 }) },
      { label: 'Refuse', consequence: 'The fragment fades. The glitches stop, but something is lost.', effect: (state) => ({ questFlags: { ...state.questFlags, neon_glitch_refused: 1 } }) },
    ],
    requirements: { minLevel: 10, requiredFlags: ['neon_glitch_traced'] },
    cooldownHours: 72,
  },
  // Token River — River Guardian's Trial
  {
    id: 'river_guardian_chain_1',
    type: 'story',
    title: 'River Guardian\'s Trial',
    description: 'The River Guardian appears and challenges you to retrieve a Rare Token from the deepest part of the river.',
    icon: '🧜',
    choices: [
      { label: 'Accept the dive', consequence: 'You dive into the data stream and search for the token.', effect: (state) => ({ questFlags: { ...state.questFlags, river_trial_accepted: 1 } }) },
      { label: 'Decline', consequence: 'The Guardian nods respectfully and vanishes.', effect: () => ({}) },
    ],
    requirements: { minLevel: 5, requiredAreas: ['token_river'] },
    cooldownHours: 48,
  },
  {
    id: 'river_guardian_chain_2',
    type: 'story',
    title: 'Token of the Deep',
    description: 'You found the Rare Token! The River Guardian is pleased and grants you passage to hidden areas.',
    icon: '🪙',
    choices: [
      { label: 'Accept passage', consequence: 'The Guardian opens a secret path. You earn +45 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, river_trial_completed: 1 }, explorationXp: state.explorationXp + 45 }) },
    ],
    requirements: { minLevel: 5, requiredFlags: ['river_trial_accepted'] },
    cooldownHours: 72,
  },
  // Void Sea — Signal from the Deep
  {
    id: 'void_signal_chain_1',
    type: 'story',
    title: 'Signal from the Deep',
    description: 'A faint signal pulses from the Void Sea. It sounds like a distress call from an old project.',
    icon: '📡',
    choices: [
      { label: 'Investigate', consequence: 'You sail into the glitchy waters toward the signal.', effect: (state) => ({ questFlags: { ...state.questFlags, void_signal_investigated: 1 } }) },
      { label: 'Too dangerous', consequence: 'You turn back. Some signals are better left unanswered.', effect: () => ({}) },
    ],
    requirements: { minLevel: 12, requiredAreas: ['void_sea'] },
    cooldownHours: 48,
  },
  {
    id: 'void_signal_chain_2',
    type: 'story',
    title: 'The Lost Project',
      description: 'You find a forgotten monster project. It offers you a Void Artifact as thanks for not deleting it.',
    icon: '🌑',
    choices: [
      { label: 'Accept the artifact', consequence: 'You receive a Void Artifact and +80 XP. The project returns to sleep.', effect: (state) => ({ questFlags: { ...state.questFlags, void_project_helped: 1 }, explorationXp: state.explorationXp + 80 }) },
      { label: 'Leave it be', consequence: 'You leave the project in peace. It will sleep another day.', effect: (state) => ({ questFlags: { ...state.questFlags, void_project_left: 1 } }) },
    ],
    requirements: { minLevel: 13, requiredFlags: ['void_signal_investigated'] },
    cooldownHours: 96,
  },
  // ===== SEASONAL STORY CHAINS =====
  // Winter — Dark Frost (Cloud Server)
  {
    id: 'dark_frost_chain_1',
    type: 'story',
    title: 'Dark Frost',
    description: 'A mysterious frost is freezing servers in the Cloud Server. Only you can stop it.',
    icon: '❄️',
    choices: [
      { label: 'Investigate the frost', consequence: 'You trace the frost to a corrupted temperature daemon.', effect: (state) => ({ questFlags: { ...state.questFlags, dark_frost_investigated: 1 } }) },
      { label: 'Ignore it', consequence: 'The frost spreads. Better luck next season.', effect: () => ({}) },
    ],
    requirements: { minLevel: 8, requiredAreas: ['cloud_server'], season: ['winter'] },
    cooldownHours: 72,
  },
  {
    id: 'dark_frost_chain_2',
    type: 'story',
    title: 'Thawing the Core',
    description: 'You must melt the core daemon using a Storm Crystal. The Cloud Server warms up.',
    icon: '🔥',
    choices: [
      { label: 'Use Storm Crystal', consequence: 'The daemon thaws. The Cloud Server is safe. +70 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, dark_frost_resolved: 1 }, explorationXp: state.explorationXp + 70 }) },
    ],
    requirements: { minLevel: 8, requiredFlags: ['dark_frost_investigated'], season: ['winter'] },
    cooldownHours: 96,
  },
  // Spring — Festival of Bloom (Home Forest)
  {
    id: 'festival_bloom_chain_1',
    type: 'story',
    title: 'Festival of Bloom',
    description: 'Spring has arrived! The Home Forest is blooming and the villagers are celebrating.',
    icon: '🌸',
    choices: [
      { label: 'Join the parade', consequence: 'You march through the blooming forest. Everyone is happy!', effect: (state) => ({ questFlags: { ...state.questFlags, festival_bloom_joined: 1 } }) },
      { label: 'Watch from afar', consequence: 'You enjoy the view from a distance.', effect: () => ({}) },
    ],
    requirements: { minLevel: 4, requiredAreas: ['home_forest'], season: ['spring'] },
    cooldownHours: 48,
  },
  {
    id: 'festival_bloom_chain_2',
    type: 'story',
    title: 'Bloom Gift',
    description: 'The villagers give you a special Token Leaf infused with spring energy.',
    icon: '🍃',
    choices: [
      { label: 'Accept the gift', consequence: 'You receive a blessed Token Leaf. +30 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, festival_bloom_gifted: 1 }, explorationXp: state.explorationXp + 30 }) },
    ],
    requirements: { minLevel: 4, requiredFlags: ['festival_bloom_joined'], season: ['spring'] },
    cooldownHours: 72,
  },
  // Summer — Neon Rave (Neon Circuit)
  {
    id: 'neon_rave_chain_1',
    type: 'story',
    title: 'Neon Rave',
    description: 'The Neon Circuit is hosting a legendary summer rave. The music is pumping!',
    icon: '🎵',
    choices: [
      { label: 'Join the rave', consequence: 'You dance the night away under neon lights.', effect: (state) => ({ questFlags: { ...state.questFlags, neon_rave_joined: 1 } }) },
      { label: 'Skip it', consequence: 'Too loud for you. You head back to the Hub.', effect: () => ({}) },
    ],
    requirements: { minLevel: 9, requiredAreas: ['neon_circuit'], season: ['summer'] },
    cooldownHours: 48,
  },
  {
    id: 'neon_rave_chain_2',
    type: 'story',
    title: 'Rave Reward',
    description: 'The DJ gives you a rare Neon Chip as a souvenir. +40 XP.',
    icon: '⚡',
    choices: [
      { label: 'Accept', consequence: 'You got a Neon Chip! Perfect for crafting.', effect: (state) => ({ questFlags: { ...state.questFlags, neon_rave_rewarded: 1 }, explorationXp: state.explorationXp + 40 }) },
    ],
    requirements: { minLevel: 9, requiredFlags: ['neon_rave_joined'], season: ['summer'] },
    cooldownHours: 72,
  },
  // Autumn — Harvest Festival (Token River)
  {
    id: 'harvest_festival_chain_1',
    type: 'story',
    title: 'Harvest Festival',
    description: 'The Token River is flowing with rare tokens during the autumn harvest.',
    icon: '🌾',
    choices: [
      { label: 'Join the harvest', consequence: 'You help collect tokens from the river.', effect: (state) => ({ questFlags: { ...state.questFlags, harvest_festival_joined: 1 } }) },
      { label: 'Rest', consequence: 'You watch the harvest from the shore.', effect: () => ({}) },
    ],
    requirements: { minLevel: 6, requiredAreas: ['token_river'], season: ['autumn'] },
    cooldownHours: 48,
  },
  {
    id: 'harvest_festival_chain_2',
    type: 'story',
    title: 'Harvest Blessing',
    description: 'The River Guardian blesses you with a Rare Token and +35 XP.',
    icon: '🪙',
    choices: [
      { label: 'Accept blessing', consequence: 'You receive a Rare Token!', effect: (state) => ({ questFlags: { ...state.questFlags, harvest_festival_blessed: 1 }, explorationXp: state.explorationXp + 35 }) },
    ],
    requirements: { minLevel: 6, requiredFlags: ['harvest_festival_joined'], season: ['autumn'] },
    cooldownHours: 72,
  },
  // ===== CROSS-AREA STORY CHAINS =====
  // The Lost Artifact — spans home_forest, token_river, bug_dungeon
  {
    id: 'lost_artifact_chain_1',
    type: 'story',
    title: 'The Lost Artifact',
    description: 'An ancient artifact has been scattered across 3 areas. Find all 3 pieces to restore it.',
    icon: '🔮',
    choices: [
      { label: 'Accept the quest', consequence: 'You begin searching for the artifact pieces.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_artifact_quest: 1 } }) },
      { label: 'Not now', consequence: 'You decide to focus on other things.', effect: () => ({}) },
    ],
    requirements: { minLevel: 10 },
    cooldownHours: 96,
  },
  {
    id: 'lost_artifact_chain_2',
    type: 'story',
    title: 'Forest Fragment',
    description: 'You found the first piece in the Home Forest. But something is guarding it...',
    icon: '🌲',
    choices: [
      { label: 'Take the fragment', consequence: 'You grab the fragment and run! +30 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_artifact_forest: 1 }, explorationXp: state.explorationXp + 30 }) },
    ],
    requirements: { minLevel: 10, requiredFlags: ['lost_artifact_quest'] },
    cooldownHours: 48,
  },
  {
    id: 'lost_artifact_chain_3',
    type: 'story',
    title: 'River Fragment',
    description: 'The second piece is at the bottom of the Token River. The River Guardian tests your resolve.',
    icon: '🌊',
    choices: [
      { label: 'Dive for it', consequence: 'You retrieve the fragment from the depths! +40 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_artifact_river: 1 }, explorationXp: state.explorationXp + 40 }) },
    ],
    requirements: { minLevel: 11, requiredFlags: ['lost_artifact_forest'] },
    cooldownHours: 48,
  },
  {
    id: 'lost_artifact_chain_4',
    type: 'story',
    title: 'Dungeon Fragment',
    description: 'The final piece is in the Bug Dungeon. The Linter guards it fiercely.',
    icon: '🏚️',
    choices: [
      { label: 'Challenge the Linter', consequence: 'You defeat the Linter and claim the fragment! +50 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_artifact_dungeon: 1 }, explorationXp: state.explorationXp + 50 }) },
    ],
    requirements: { minLevel: 12, requiredFlags: ['lost_artifact_river'] },
    cooldownHours: 72,
  },
  {
    id: 'lost_artifact_chain_5',
    type: 'story',
    title: 'Artifact Restored',
    description: 'All 3 pieces are assembled! The artifact glows with power. You feel stronger.',
    icon: '✨',
    choices: [
      { label: 'Activate it', consequence: 'The artifact bestows its power upon you! +100 XP and a rare item.', effect: (state) => ({ questFlags: { ...state.questFlags, lost_artifact_complete: 1 }, explorationXp: state.explorationXp + 100 }) },
    ],
    requirements: { minLevel: 12, requiredFlags: ['lost_artifact_forest', 'lost_artifact_river', 'lost_artifact_dungeon'] },
    cooldownHours: 168,
  },
  // The Glitch Cure — spans neon_circuit, void_sea, cloud_server
  {
    id: 'glitch_cure_chain_1',
    type: 'story',
    title: 'The Glitch Cure',
    description: 'A mysterious glitch is spreading across the digital world. Only a legendary cure can stop it.',
    icon: '📡',
    choices: [
      { label: 'Accept the mission', consequence: 'You set out to find the cure ingredients.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_cure_quest: 1 } }) },
      { label: 'Too risky', consequence: 'You avoid the glitch for now.', effect: () => ({}) },
    ],
    requirements: { minLevel: 14 },
    cooldownHours: 120,
  },
  {
    id: 'glitch_cure_chain_2',
    type: 'story',
    title: 'Neon Chip (Neon Circuit)',
    description: 'The first ingredient is a Neon Chip from the Neon Circuit. The Rogue AI guards it.',
    icon: '⚡',
    choices: [
      { label: 'Take the chip', consequence: 'You obtain the Neon Chip! +20 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_cure_neon: 1 }, explorationXp: state.explorationXp + 20 }) },
    ],
    requirements: { minLevel: 14, requiredFlags: ['glitch_cure_quest'], requiredAreas: ['neon_circuit'] },
    cooldownHours: 48,
  },
  {
    id: 'glitch_cure_chain_3',
    type: 'story',
    title: 'Void Crystal (Void Sea)',
    description: 'The second ingredient is a Void Artifact from the Void Sea. The Lost Maintainer knows where it is.',
    icon: '🌑',
    choices: [
      { label: 'Ask the Maintainer', consequence: 'The Maintainer gives you the Void Artifact! +30 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_cure_void: 1 }, explorationXp: state.explorationXp + 30 }) },
    ],
    requirements: { minLevel: 15, requiredFlags: ['glitch_cure_neon'], requiredAreas: ['void_sea'] },
    cooldownHours: 48,
  },
  {
    id: 'glitch_cure_chain_4',
    type: 'story',
    title: 'Storm Essence (Cloud Server)',
    description: 'The final ingredient is Storm Essence from the Cloud Server. The wind spirit can help.',
    icon: '🌬️',
    choices: [
      { label: 'Ask the wind spirit', consequence: 'The spirit grants you Storm Essence! +40 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_cure_storm: 1 }, explorationXp: state.explorationXp + 40 }) },
    ],
    requirements: { minLevel: 16, requiredFlags: ['glitch_cure_void'], requiredAreas: ['cloud_server'] },
    cooldownHours: 72,
  },
  {
    id: 'glitch_cure_chain_5',
    type: 'story',
    title: 'Cure Deployed',
    description: 'The cure is complete! You deploy it across the digital world. The glitch fades.',
    icon: '✨',
    choices: [
      { label: 'Deploy the cure', consequence: 'The digital world is saved! You earn +150 XP and the title "Glitch Hero".', effect: (state) => ({ questFlags: { ...state.questFlags, glitch_cure_complete: 1 }, explorationXp: state.explorationXp + 150 }) },
    ],
    requirements: { minLevel: 16, requiredFlags: ['glitch_cure_neon', 'glitch_cure_void', 'glitch_cure_storm'] },
    cooldownHours: 240,
  },
  // The Ancient Code — 6-step cross-area chain spanning all 6 areas
  {
    id: 'ancient_code_chain_1',
    type: 'story',
    title: 'The Ancient Code',
    description: 'An ancient prophecy speaks of a lost code hidden across 6 areas. Restore it to unlock ultimate power.',
    icon: '📜',
    choices: [
      { label: 'Accept the prophecy', consequence: 'Your journey to restore the Ancient Code begins.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_quest: 1 } }) },
      { label: 'Not yet', consequence: 'You are not ready for this quest.', effect: () => ({}) },
    ],
    requirements: { minLevel: 15 },
    cooldownHours: 168,
  },
  {
    id: 'ancient_code_chain_2',
    type: 'story',
    title: 'Forest Rune (Home Forest)',
    description: 'The first code fragment is hidden in the Home Forest. A mysterious rune points the way.',
    icon: '🌲',
    choices: [
      { label: 'Decipher the rune', consequence: 'You uncover the first code fragment! +25 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_forest: 1 }, explorationXp: state.explorationXp + 25 }) },
    ],
    requirements: { minLevel: 15, requiredFlags: ['ancient_code_quest'], requiredAreas: ['home_forest'] },
    cooldownHours: 48,
  },
  {
    id: 'ancient_code_chain_3',
    type: 'story',
    title: 'River Glyph (Token River)',
    description: 'The second fragment is at the Token River. The water spirit tests your wisdom.',
    icon: '🌊',
    choices: [
      { label: 'Answer the riddle', consequence: 'The spirit rewards you with the second fragment! +35 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_river: 1 }, explorationXp: state.explorationXp + 35 }) },
    ],
    requirements: { minLevel: 16, requiredFlags: ['ancient_code_forest'], requiredAreas: ['token_river'] },
    cooldownHours: 48,
  },
  {
    id: 'ancient_code_chain_4',
    type: 'story',
    title: 'Dungeon Sigil (Bug Dungeon)',
    description: 'The third fragment lies in the Bug Dungeon. The Linter has corrupted the sigil.',
    icon: '🏚️',
    choices: [
      { label: 'Cleanse the sigil', consequence: 'You purify the sigil and claim the fragment! +45 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_dungeon: 1 }, explorationXp: state.explorationXp + 45 }) },
    ],
    requirements: { minLevel: 17, requiredFlags: ['ancient_code_river'], requiredAreas: ['bug_dungeon'] },
    cooldownHours: 72,
  },
  {
    id: 'ancient_code_chain_5',
    type: 'story',
    title: 'Neon Cipher (Neon Circuit)',
    description: 'The fourth fragment is encoded in the Neon Circuit. Decrypt it before the Rogue AI finds it.',
    icon: '⚡',
    choices: [
      { label: 'Hack the cipher', consequence: 'You decrypt the cipher and secure the fragment! +55 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_neon: 1 }, explorationXp: state.explorationXp + 55 }) },
    ],
    requirements: { minLevel: 18, requiredFlags: ['ancient_code_dungeon'], requiredAreas: ['neon_circuit'] },
    cooldownHours: 72,
  },
  {
    id: 'ancient_code_chain_6',
    type: 'story',
    title: 'Void Echo (Void Sea)',
    description: 'The fifth fragment echoes in the Void Sea. The Lost Maintainer holds the key.',
    icon: '🌑',
    choices: [
      { label: 'Face the Maintainer', consequence: 'The Maintainer yields the fragment! +65 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_void: 1 }, explorationXp: state.explorationXp + 65 }) },
    ],
    requirements: { minLevel: 19, requiredFlags: ['ancient_code_neon'], requiredAreas: ['void_sea'] },
    cooldownHours: 96,
  },
  {
    id: 'ancient_code_chain_7',
    type: 'story',
    title: 'Storm Archive (Cloud Server)',
    description: 'The final fragment is in the Cloud Server. The storm spirit guards the archive.',
    icon: '🌬️',
    choices: [
      { label: 'Brace the storm', consequence: 'You survive the storm and claim the last fragment! +75 XP.', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_storm: 1 }, explorationXp: state.explorationXp + 75 }) },
    ],
    requirements: { minLevel: 20, requiredFlags: ['ancient_code_void'], requiredAreas: ['cloud_server'] },
    cooldownHours: 120,
  },
  {
    id: 'ancient_code_chain_8',
    type: 'story',
    title: 'Code Restored',
    description: 'All 6 fragments are assembled! The Ancient Code awakens, granting you immense power.',
    icon: '✨',
    choices: [
      { label: 'Activate the code', consequence: 'The Ancient Code bestows ultimate power! +200 XP and the title "Code Master".', effect: (state) => ({ questFlags: { ...state.questFlags, ancient_code_complete: 1 }, explorationXp: state.explorationXp + 200 }) },
    ],
    requirements: { minLevel: 20, requiredFlags: ['ancient_code_forest', 'ancient_code_river', 'ancient_code_dungeon', 'ancient_code_neon', 'ancient_code_void', 'ancient_code_storm'] },
    cooldownHours: 336,
  },
];

// ===== EVENT ENGINE =====
export interface EventEngineOptions {
  getWorldState: () => WorldState;
  addEventLog: (entry: { type: string; title: string; description: string }) => void;
  spawnToast: (toast: { title: string; message: string; color?: string }) => void;
  getPersonality?: () => { type: string; traits: Record<string, number> };
}

export function createEventEngine(opts: EventEngineOptions) {
  const activeEvents: ActiveEvent[] = [];
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  function evaluate() {
    const world = opts.getWorldState();
    if (world.activeEventId) return; // already in event

    // Clean up expired events
    const now = Date.now();
    activeEvents.forEach((e) => {
      if (now - e.spawnedAt > 1000 * 60 * 60) e.resolved = true; // 1h expiry
    });

    if (Math.random() > 0.3) return; // 30% chance per tick to spawn

    const roll = Math.random();
    let eventDef: EventDef | null = null;

    if (roll < 0.35) {
      // Story event (rare but meaningful)
      const eligible = STORY_EVENTS.filter((s) => meetsRequirements(s.requirements, world));
      if (eligible.length > 0) eventDef = pickRandom(eligible);
    } else if (roll < 0.55) {
      // NPC encounter
      const npc = pickRandomNPC(world, opts.getPersonality?.());
      if (npc) eventDef = createNPCEvent(npc, world, opts);
    } else if (roll < 0.75) {
      // Wild Monster
      const wild = pickRandomWildMonster(world, opts.getPersonality?.());
      if (wild) eventDef = createWildMonsterEvent(wild, world);
    } else if (roll < 0.9) {
      // Environmental
      const env = pickRandom(ENVIRONMENTAL_EVENTS);
      eventDef = {
        id: env.id,
        type: 'environmental',
        title: env.title,
        description: env.description,
        icon: env.icon,
        onComplete: (state) => env.effect(state),
      };
    } else if (roll < 0.97) {
      // Legendary (rare)
      const legendary = pickRandomLegendary(world);
      if (legendary) eventDef = createLegendaryEvent(legendary, world);
    } else {
      // Empty (peaceful)
      eventDef = {
        id: 'empty_' + Date.now(),
        type: 'empty',
        title: 'Quiet Moment',
        description: 'The area is peaceful. Nothing of note happens.',
        icon: '🍃',
      };
    }

    if (eventDef) {
      const active: ActiveEvent = { def: eventDef, spawnedAt: now, location: world.currentArea, resolved: false };
      activeEvents.push(active);
      opts.addEventLog({ type: eventDef.type, title: eventDef.title, description: eventDef.description });
      opts.spawnToast({ title: eventDef.title, message: eventDef.description, color: colorForEventType(eventDef.type) });
    }
  }

  function startTick(intervalMs = 60000) {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(evaluate, intervalMs);
  }

  function stopTick() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
  }

  return { startTick, stopTick, evaluate, getActiveEvents: () => activeEvents.filter((e) => !e.resolved) };
}

function pickRandomNPC(world: WorldState, personality?: { type: string; traits: Record<string, number> }): NPCDef | null {
  const available = NPC_DEFS.filter((npc) => {
    const hour = new Date().getHours();
    const scheduleEntry = npc.schedule.find((s) => hour >= s.hourStart && hour < s.hourEnd);
    if (!scheduleEntry || !scheduleEntry.areas.includes(world.currentArea)) return false;
    
    // Personality-driven weighting
    if (personality) {
      const riskTolerance = personality.traits.riskTolerance ?? 0.5;
      const type = personality.type;
      
      // Brave/hyper/chaotic prefer NPCs with requests (more action)
      if (['brave', 'hyper', 'chaotic'].includes(type) && riskTolerance > 0.6) {
        return true; // weight toward interactive NPCs
      }
      // Calm/stoic prefer peaceful NPCs
      if (['calm', 'stoic', 'nurturing'].includes(type) && riskTolerance < 0.4) {
        return true;
      }
      // Curious/genius prefer knowledgeable NPCs
      if (['curious', 'genius'].includes(type)) {
        return true;
      }
    }
    return true;
  });
  
  if (available.length === 0) return null;
  
  // If personality provided, weight the selection
  if (personality) {
    const weights = available.map((npc) => {
      let weight = 1;
      const type = personality.type;

      if (type === 'brave' && npc.request) weight = 3;
      else if (type === 'curious' && ['merchant_rin', 'trainer_kai', 'hacker_vee'].includes(npc.id)) weight = 2;
      else if (type === 'lazy' && !npc.request) weight = 2;
      else if (type === 'genius' && ['hacker_vee', 'trainer_kai'].includes(npc.id)) weight = 2;
      else if (type === 'nurturing' && npc.friendship < 10) weight = 2;
      else if (type === 'chaotic') weight = Math.random() * 3;

      return weight;
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      roll -= weights[i]!;
      if (roll <= 0) return available[i]!;
    }
  }
  
  return pickRandom(available);
}

function pickRandomWildMonster(world: WorldState, personality?: { type: string; traits: Record<string, number> }): WildMonsterDef | null {
  const available = WILD_MONSTER.filter((d) => {
    if (!d.habitat.includes(world.currentArea)) return false;
    if (d.timeOfDay) {
      const hour = new Date().getHours();
      const timeOfDay = getTimeOfDay(hour);
      if (!d.timeOfDay.includes(timeOfDay)) return false;
    }
    if (d.weather && d.weather.length > 0 && !d.weather.includes(world.weather)) return false;
    return true;
  });

  if (available.length === 0) return null;

  if (personality) {
    const weights = available.map((monster) => {
      let weight = 1;
      const type = personality.type;
      const risk = personality.traits.riskTolerance ?? 0.5;

      if (type === 'brave' && monster.behavior === 'aggressive') weight = 3;
      else if (type === 'curious' && ['champion', 'ultimate'].includes(monster.form)) weight = 2;
      else if (type === 'lazy' && monster.behavior === 'passive') weight = 2;
      else if (type === 'genius' && monster.behavior !== 'passive') weight = 2;
      else if (type === 'chaotic') weight = Math.random() * 3;
      else if (risk > 0.7 && monster.behavior === 'aggressive') weight = 2;
      else if (risk < 0.3 && monster.behavior === 'passive') weight = 2;

      return weight;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      roll -= weights[i]!;
      if (roll <= 0) return available[i]!;
    }
  }

  return pickRandom(available);
}

function pickRandomLegendary(world: WorldState): LegendaryDef | null {
  const available = LEGENDARY_MONSTER.filter((l) => {
    if (l.condition.minLevel && world.explorationXp < l.condition.minLevel) return false;
    return true;
  });
  return available.length > 0 ? pickRandom(available) : null;
}

function createNPCEvent(npc: NPCDef, world: WorldState, options: EventEngineOptions): EventDef {
  const currentFriendship = world.npcFriendship?.[npc.id] ?? 0;
  const alreadyMet = !!world.npcMet?.[npc.id];
  const isFriendly = currentFriendship >= 10;
  const hasRequest = !!npc.request && !isFriendly;
  const personality = options.getPersonality?.();
  const unlockedMilestones = world.npcBondMilestones?.[npc.id] ?? [];

  const addMilestone = (state: WorldState, newFriendship: number) => {
    const next = getNextBondMilestone(npc.id, newFriendship);
    if (!next) return [];
    const alreadyUnlocked = state.npcBondMilestones?.[npc.id]?.includes(next.friendshipThreshold);
    if (alreadyUnlocked) return [];
    return [next];
  };

  const talkEffect = (state: WorldState) => {
    const newFriendship = (state.npcFriendship?.[npc.id] ?? 0) + 1;
    const milestones = addMilestone(state, newFriendship);
    return {
      questFlags: { ...state.questFlags, [`${npc.id}_met`]: 1 },
      npcMet: { ...state.npcMet, [npc.id]: true },
      npcFriendship: { ...state.npcFriendship, [npc.id]: newFriendship },
      npcBondMilestones: {
        ...state.npcBondMilestones,
        [npc.id]: [...(state.npcBondMilestones?.[npc.id] ?? unlockedMilestones), ...milestones.map(m => m.friendshipThreshold)],
      },
    };
  };

  const helpEffect = (state: WorldState) => {
    const newFriendship = (state.npcFriendship?.[npc.id] ?? 0) + 5;
    const milestones = addMilestone(state, newFriendship);
    return {
      questFlags: { ...state.questFlags, [`${npc.id}_helped`]: 1 },
      npcMet: { ...state.npcMet, [npc.id]: true },
      npcFriendship: { ...state.npcFriendship, [npc.id]: newFriendship },
      npcBondMilestones: {
        ...state.npcBondMilestones,
        [npc.id]: [...(state.npcBondMilestones?.[npc.id] ?? unlockedMilestones), ...milestones.map(m => m.friendshipThreshold)],
      },
    };
  };

  const leaveEffect = (state: WorldState) => ({
    npcMet: { ...state.npcMet, [npc.id]: true },
    npcFriendship: { ...state.npcFriendship, [npc.id]: (state.npcFriendship?.[npc.id] ?? 0) + (alreadyMet ? 0 : 1) },
  });

  const firstMeetDialogue = personality
    ? getPersonalityDialogue(personality as any, npc.dialogue, 'first_meet')
    : npc.dialogue.first_meet;
  const friendlyDialogue = personality
    ? getPersonalityDialogue(personality as any, npc.dialogue, 'friendly')
    : npc.dialogue.friendly;
  const thanksDialogue = personality
    ? getPersonalityDialogue(personality as any, npc.dialogue, 'thanks')
    : npc.dialogue.thanks;
  const leaveDialogue = personality
    ? getPersonalityDialogue(personality as any, npc.dialogue, 'leave')
    : npc.dialogue.leave;

  const nextMilestone = getNextBondMilestone(npc.id, currentFriendship);
  const milestoneHint = nextMilestone ? `\n\n(Bond milestone at ${nextMilestone.friendshipThreshold}: ${nextMilestone.title})` : '';

  return {
    id: 'npc_' + npc.id + '_' + Date.now(),
    type: 'npc',
    title: alreadyMet ? `You met ${npc.name}` : `You met ${npc.name}`,
    description: (isFriendly ? friendlyDialogue : alreadyMet ? friendlyDialogue : firstMeetDialogue) + milestoneHint,
    icon: npc.sprite,
    choices: hasRequest
      ? [
          { label: 'Help ' + npc.name, consequence: thanksDialogue, effect: helpEffect },
          { label: 'Not now', consequence: leaveDialogue, effect: leaveEffect },
        ]
      : [
          { label: 'Talk', consequence: friendlyDialogue, effect: talkEffect },
          { label: 'Leave', consequence: leaveDialogue, effect: leaveEffect },
        ],
  };
}

function createWildMonsterEvent(wild: WildMonsterDef, _world: WorldState): EventDef {
  const behaviorText = wild.behavior === 'passive' ? 'is peacefully grazing' : wild.behavior === 'neutral' ? 'is watching you cautiously' : 'is growling aggressively!';
  return {
    id: 'wild_' + wild.id + '_' + Date.now(),
    type: 'wild_monster',
    title: `Wild ${wild.name} appears!`,
    description: `A level ${wild.level} ${wild.name} ${behaviorText}.`,
    icon: wild.sprite,
    choices: [
      { label: 'Battle', consequence: `You fought ${wild.name}!`, effect: () => ({}) },
      { label: 'Befriend', consequence: `You offered food. ${wild.name} seems to like you!`, effect: () => ({}) },
      { label: 'Run', consequence: 'You escaped safely.', effect: () => ({}) },
    ],
  };
}

function createLegendaryEvent(legendary: LegendaryDef, _world: WorldState): EventDef {
  return {
    id: 'legendary_' + legendary.id + '_' + Date.now(),
    type: 'legendary',
    title: `${legendary.title} — ${legendary.name}`,
    description: legendary.description,
    icon: legendary.sprite,
    choices: [
      { label: 'Challenge', consequence: 'You faced the legendary monster!', effect: () => ({}) },
      { label: 'Observe', consequence: 'You watched from a safe distance.', effect: () => ({}) },
    ],
  };
}

export function meetsRequirements(req: EventRequirement | undefined, world: WorldState): boolean {
  if (!req) return true;
  if (req.minLevel && world.explorationXp < req.minLevel) return false;
  if (req.requiredFlags && req.requiredFlags.length > 0) {
    const flags = world.questFlags || {};
    if (!req.requiredFlags.every((f) => flags[f])) return false;
  }
  if (req.requiredAreas && req.requiredAreas.length > 0) {
    if (!req.requiredAreas.includes(world.currentArea)) return false;
  }
  if (req.season && req.season.length > 0) {
    if (!req.season.includes(world.season)) return false;
  }
  return true;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function colorForEventType(type: EventType): string {
  switch (type) {
    case 'npc': return '#50b8a0';
    case 'wild_monster': return '#e8607c';
    case 'environmental': return '#f0b040';
    case 'legendary': return '#a080e0';
    case 'story': return '#60a8e8';
    default: return '#8a7a9a';
  }
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 22) return 'night';
  return 'late_night';
}

export { getTimeOfDay };
