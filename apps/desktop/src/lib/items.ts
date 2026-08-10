// Items system — type-safe registry, effects, and shop helpers.

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'consumable' | 'material' | 'key' | 'equip';
  effect?: (state: any) => any;
  price?: number;
  sellPrice?: number;
}

export const ITEMS_REGISTRY: Record<string, ItemDef> = {
  potion_hp: {
    id: 'potion_hp',
    name: 'HP Potion',
    description: 'Restores pet health and energy.',
    icon: '🧪',
    category: 'consumable',
    price: 50,
    sellPrice: 25,
    effect: (state: any) => {
      const needs = { ...state.needs, energy: Math.min(100, state.needs.energy + 20), hunger: Math.max(0, state.needs.hunger - 10) };
      return { needs };
    },
  },
  potion_sp: {
    id: 'potion_sp',
    name: 'SP Potion',
    description: 'Restores special energy for evolution.',
    icon: '💎',
    category: 'consumable',
    price: 80,
    sellPrice: 40,
    effect: (state: any) => {
      const evo = state.petEvolution || state.evolution;
      if (!evo) return {};
      const updated = { ...evo, sp: Math.min(evo.maxSp || 100, (evo.sp || 0) + 30) };
      return { petEvolution: updated, evolution: updated };
    },
  },
  revive: {
    id: 'revive',
    name: 'Revive',
    description: 'Brings pet back from critical state.',
    icon: '✨',
    category: 'consumable',
    price: 120,
    sellPrice: 60,
    effect: (state: any) => {
      const needs = { ...state.needs, energy: Math.min(100, state.needs.energy + 50) };
      return { needs };
    },
  },
  token_leaf: {
    id: 'token_leaf',
    name: 'Token Leaf',
    description: 'A rare leaf from the Token River. Used for crafting.',
    icon: '🍃',
    category: 'material',
    price: 20,
    sellPrice: 10,
  },
  rare_token: {
    id: 'rare_token',
    name: 'Rare Token',
    description: 'A shiny token with data essence. Highly valuable.',
    icon: '🪙',
    category: 'material',
    price: 100,
    sellPrice: 50,
  },
  debug_gem: {
    id: 'debug_gem',
    name: 'Debug Gem',
    description: 'A crystallized debug trace. Used for evolution.',
    icon: '💠',
    category: 'material',
    price: 150,
    sellPrice: 75,
  },
  neon_chip: {
    id: 'neon_chip',
    name: 'Neon Chip',
    description: 'A chip from the Neon Circuit. Glows with energy.',
    icon: '⚡',
    category: 'material',
    price: 200,
    sellPrice: 100,
  },
  void_artifact: {
    id: 'void_artifact',
    name: 'Void Artifact',
    description: 'An ancient artifact from the Void Sea. Very rare.',
    icon: '🌑',
    category: 'key',
    price: 500,
    sellPrice: 250,
  },
  glitch_key: {
    id: 'glitch_key',
    name: 'Glitch Key',
    description: 'A key that can unlock hidden areas.',
    icon: '🔑',
    category: 'key',
    price: 300,
    sellPrice: 150,
  },
  data_map: {
    id: 'data_map',
    name: 'Data Map',
    description: 'Reveals hidden paths in the digital world.',
    icon: '🗺️',
    category: 'equip',
    price: 250,
    sellPrice: 125,
  },
  memory_boost: {
    id: 'memory_boost',
    name: 'Memory Boost',
    description: 'Temporarily increases memory capacity.',
    icon: '🧠',
    category: 'consumable',
    price: 180,
    sellPrice: 90,
    effect: (state: any) => {
      const memoryIndex = { ...state.memoryIndex, _boosted: 1 };
      return { memoryIndex };
    },
  },
  storm_crystal: {
    id: 'storm_crystal',
    name: 'Storm Crystal',
    description: 'A crystal charged with storm energy.',
    icon: '🌩️',
    category: 'material',
    price: 350,
    sellPrice: 175,
  },
  // Evolution catalyst items — rare materials for evolution paths
  data_crystal: {
    id: 'data_crystal',
    name: 'Data Crystal',
    description: 'A crystallized fragment of pure data. Core evolution catalyst.',
    icon: '💠',
    category: 'material',
    price: 500,
    sellPrice: 250,
  },
  soul_fragment: {
    id: 'soul_fragment',
    name: 'Soul Fragment',
    description: 'A shard of digital soul. Enables mega evolution.',
    icon: '💜',
    category: 'material',
    price: 800,
    sellPrice: 400,
  },
  memory_essence: {
    id: 'memory_essence',
    name: 'Memory Essence',
    description: 'Distilled memories from the digital world. Path evolution catalyst.',
    icon: '🧬',
    category: 'material',
    price: 600,
    sellPrice: 300,
  },
  code_shard: {
    id: 'code_shard',
    name: 'Code Shard',
    description: 'A broken fragment of source code. Glitch evolution catalyst.',
    icon: '🧩',
    category: 'material',
    price: 450,
    sellPrice: 225,
  },
};

export type ItemId = keyof typeof ITEMS_REGISTRY;

export function getItem(id: string): ItemDef | undefined {
  return ITEMS_REGISTRY[id];
}

export function addItem(state: any, itemId: string): any {
  const items = [...(state.items || []), itemId];
  return { items };
}

export function removeItem(state: any, itemId: string): any {
  const items = (state.items || []).filter((id: string) => id !== itemId);
  return { items };
}

export function hasItem(state: any, itemId: string): boolean {
  return (state.items || []).includes(itemId);
}

export function countItem(state: any, itemId: string): number {
  return (state.items || []).filter((id: string) => id === itemId).length;
}

export function useItem(state: any, itemId: string): any {
  const item = ITEMS_REGISTRY[itemId];
  if (!item) return state;
  if (!hasItem(state, itemId)) return state;
  const without = removeItem(state, itemId);
  if (item.effect) {
    return { ...without, ...item.effect(state) };
  }
  return without;
}

export function useItemOnPet(state: any, itemId: string): any {
  return useItem(state, itemId);
}

export function buyItem(state: any, itemId: string): any {
  const item = ITEMS_REGISTRY[itemId];
  if (!item) return state;
  const currency = state.currency || 0;
  const price = item.price || 0;
  if (currency < price) return state;
  const updated = {
    ...state,
    currency: currency - price,
    items: [...(state.items || []), itemId],
  };
  return updated;
}

export function sellItem(state: any, itemId: string): any {
  const item = ITEMS_REGISTRY[itemId];
  if (!item || !hasItem(state, itemId)) return state;
  const sellPrice = item.sellPrice || 0;
  const updated = {
    ...state,
    currency: (state.currency || 0) + sellPrice,
    items: (state.items || []).filter((id: string) => id !== itemId),
  };
  return updated;
}

export interface CraftingRecipe {
  id: string;
  resultItemId: string;
  ingredients: { itemId: string; count: number }[];
  label: string;
  description: string;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_hp_potion',
    resultItemId: 'potion_hp',
    ingredients: [{ itemId: 'token_leaf', count: 2 }, { itemId: 'rare_token', count: 1 }],
    label: 'HP Potion',
    description: 'Combine 2 Token Leaves + 1 Rare Token into a healing potion.',
  },
  {
    id: 'craft_sp_potion',
    resultItemId: 'potion_sp',
    ingredients: [{ itemId: 'debug_gem', count: 1 }, { itemId: 'neon_chip', count: 1 }],
    label: 'SP Potion',
    description: 'Fuse 1 Debug Gem + 1 Neon Chip into an SP Potion.',
  },
  {
    id: 'craft_revive',
    resultItemId: 'revive',
    ingredients: [{ itemId: 'void_artifact', count: 1 }, { itemId: 'storm_crystal', count: 1 }],
    label: 'Revive',
    description: 'Combine 1 Void Artifact + 1 Storm Crystal into a Revive.',
  },
  {
    id: 'craft_memory_boost',
    resultItemId: 'memory_boost',
    ingredients: [{ itemId: 'rare_token', count: 2 }, { itemId: 'debug_gem', count: 1 }],
    label: 'Memory Boost',
    description: 'Fuse 2 Rare Tokens + 1 Debug Gem into a Memory Boost.',
  },
  {
    id: 'craft_glitch_key',
    resultItemId: 'glitch_key',
    ingredients: [{ itemId: 'neon_chip', count: 2 }, { itemId: 'debug_gem', count: 1 }],
    label: 'Glitch Key',
    description: 'Combine 2 Neon Chips + 1 Debug Gem into a Glitch Key.',
  },
  // Advanced recipes
  {
    id: 'craft_super_hp',
    resultItemId: 'potion_hp',
    ingredients: [{ itemId: 'potion_hp', count: 2 }, { itemId: 'rare_token', count: 2 }],
    label: 'Super HP Potion',
    description: 'Combine 2 HP Potions + 2 Rare Tokens into a stronger potion.',
  },
  {
    id: 'craft_data_map',
    resultItemId: 'data_map',
    ingredients: [{ itemId: 'glitch_key', count: 1 }, { itemId: 'debug_gem', count: 1 }],
    label: 'Data Map',
    description: 'Use a Glitch Key and Debug Gem to reveal hidden paths.',
  },
  {
    id: 'craft_storm_crystal',
    resultItemId: 'storm_crystal',
    ingredients: [{ itemId: 'neon_chip', count: 2 }, { itemId: 'rare_token', count: 1 }],
    label: 'Storm Crystal',
    description: 'Fuse 2 Neon Chips + 1 Rare Token into a Storm Crystal.',
  },
  // Evolution catalyst recipes
  {
    id: 'craft_evolution_catalyst',
    resultItemId: 'data_crystal',
    ingredients: [{ itemId: 'debug_gem', count: 2 }, { itemId: 'neon_chip', count: 1 }],
    label: 'Data Crystal',
    description: 'Fuse 2 Debug Gems + 1 Neon Chip into a Data Crystal — core evolution catalyst.',
  },
  {
    id: 'craft_mega_catalyst',
    resultItemId: 'soul_fragment',
    ingredients: [{ itemId: 'data_crystal', count: 1 }, { itemId: 'storm_crystal', count: 1 }, { itemId: 'rare_token', count: 2 }],
    label: 'Soul Fragment',
    description: 'Combine Data Crystal + Storm Crystal + 2 Rare Tokens into a Soul Fragment — mega evolution catalyst.',
  },
  {
    id: 'craft_path_catalyst',
    resultItemId: 'memory_essence',
    ingredients: [{ itemId: 'debug_gem', count: 1 }, { itemId: 'code_shard', count: 1 }, { itemId: 'rare_token', count: 1 }],
    label: 'Memory Essence',
    description: 'Fuse Debug Gem + Code Shard + Rare Token into Memory Essence — path evolution catalyst.',
  },
  {
    id: 'craft_code_shard',
    resultItemId: 'code_shard',
    ingredients: [{ itemId: 'neon_chip', count: 1 }, { itemId: 'glitch_key', count: 1 }],
    label: 'Code Shard',
    description: 'Combine Neon Chip + Glitch Key into a Code Shard — glitch evolution catalyst.',
  },
];

export function canCraft(state: any, recipeId: string): boolean {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;
  for (const ingredient of recipe.ingredients) {
    if ((countItem(state, ingredient.itemId) || 0) < ingredient.count) return false;
  }
  return true;
}

export function craftItem(state: any, recipeId: string): any {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe || !canCraft(state, recipeId)) return state;
  let items = [...(state.items || [])];
  for (const ingredient of recipe.ingredients) {
    let removed = 0;
    items = items.filter((id: string) => {
      if (id === ingredient.itemId && removed < ingredient.count) {
        removed++;
        return false;
      }
      return true;
    });
  }
  return { ...state, items: [...items, recipe.resultItemId] };
}

export function getAvailableRecipes(state: any): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter(r => canCraft(state, r.id));
}

export function getShopItems(npcId: string): string[] {
  const npcShopItems: Record<string, string[]> = {
    merchant_rin: ['potion_hp', 'potion_sp', 'revive', 'token_leaf', 'data_crystal', 'code_shard'],
    hacker_vee: ['glitch_key', 'data_map', 'memory_boost', 'soul_fragment', 'memory_essence'],
  };
  return npcShopItems[npcId] || [];
}
