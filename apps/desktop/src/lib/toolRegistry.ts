// Tool registry — search/discovery layer for large tool sets.
//
// Instead of stuffing every tool definition into every LLM context,
// this module indexes tools by category, intent, and keyword, then
// returns only the most relevant subset for a given user message.

import { TOOLS, SECOND_BRAIN_TOOLS, BROWSEROS_TOOLS, type ToolResult } from './mcp.ts';

export type ToolCategory = 'memory' | 'chat' | 'goal' | 'secondbrain' | 'browseros' | 'system';

export interface ToolDef {
  name: string;
  category: ToolCategory;
  description: string;
  keywords: string[];
  readOnly: boolean;
  params: Record<string, string>;
}

const READ_ONLY_TOOL_NAMES = new Set([
  'memory.recall', 'memory.search', 'memory.episodes', 'memory.facts',
  'memory.topics', 'memory.graph', 'chat.stats', 'chat.tokens',
  'chat.budget', 'chat.theme', 'memory.export',
]);

const READ_ONLY_SECOND_BRAIN = new Set([
  'secondbrain.search', 'secondbrain.list', 'secondbrain.read',
  'secondbrain.recent', 'secondbrain.health', 'secondbrain.graph_stats',
  'secondbrain.recall', 'secondbrain.expand', 'secondbrain.remember',
  'secondbrain.timeline', 'secondbrain.audit', 'secondbrain.inbox',
  'secondbrain.next_moves', 'secondbrain.commitments',
]);

const READ_ONLY_BROWSEROS = new Set([
  'browseros.take_snapshot', 'browseros.take_enhanced_snapshot',
  'browseros.take_screenshot', 'browseros.get_page_content',
  'browseros.get_page_links', 'browseros.get_dom', 'browseros.search_dom',
  'browseros.list_pages', 'browseros.list_windows',
  'browseros.list_tab_groups', 'browseros.get_active_page',
  'browseros.get_recent_history', 'browseros.search_history',
  'browseros.browseros_info', 'browseros.discover_categories_or_actions',
  'browseros.get_category_actions', 'browseros.get_action_details',
  'browseros.search_documentation',
]);

const TOOL_DEFS: ToolDef[] = [
  ...TOOLS.map((name) => ({
    name,
    category: name.split('.')[0] as ToolCategory,
    description: getToolDescription(name),
    keywords: getToolKeywords(name),
    readOnly: READ_ONLY_TOOL_NAMES.has(name),
    params: getToolParams(name),
  })),
  ...SECOND_BRAIN_TOOLS.map((name) => ({
    name,
    category: 'secondbrain' as ToolCategory,
    description: getToolDescription(name),
    keywords: getToolKeywords(name),
    readOnly: READ_ONLY_SECOND_BRAIN.has(name),
    params: getToolParams(name),
  })),
  ...BROWSEROS_TOOLS.map((name) => ({
    name,
    category: 'browseros' as ToolCategory,
    description: getToolDescription(name),
    keywords: getToolKeywords(name),
    readOnly: READ_ONLY_BROWSEROS.has(name),
    params: getToolParams(name),
  })),
];

function getToolDescription(name: string): string {
  const parts = name.split('.');
  const tool = parts[1];
  const category = parts[0];
  const map: Record<string, string> = {
    'memory.recall': 'Recall relevant memories by semantic search',
    'memory.record': 'Store a typed fact with confidence score',
    'memory.search': 'Keyword search across episodes and facts',
    'memory.episodes': 'List recent episodic memories',
    'memory.facts': 'List all stored facts',
    'memory.topics': 'Get top memory topics by frequency',
    'memory.graph': 'Get memory graph data for visualization',
    'memory.topic.record': 'Record topic frequency',
    'memory.episode.record': 'Record a new episodic memory',
    'memory.export': 'Export memory as JSON',
    'chat.stats': 'Get chat statistics and daily spend',
    'chat.tokens': 'Get token usage state',
    'chat.budget': 'Get cost caps and decision for hypothetical call',
    'chat.budget.set': 'Persist new cost caps',
    'chat.theme': 'Get or set UI theme',
    'goal.list': 'List all goals with progress',
    'goal.create': 'Create a new goal with optional steps',
    'goal.markdone': 'Mark a goal step as done',
    'goal.complete': 'Mark entire goal as complete',
    'secondbrain.search': 'Search second brain notes',
    'secondbrain.list': 'List second brain items',
    'secondbrain.read': 'Read a second brain item',
    'secondbrain.recent': 'Get recent second brain activity',
    'secondbrain.health': 'Check second brain health',
    'secondbrain.graph_stats': 'Get second brain graph statistics',
    'secondbrain.append_note': 'Append to a second brain note',
    'secondbrain.create_note': 'Create a new second brain note',
    'secondbrain.file_knowledge': 'File knowledge in second brain',
    'secondbrain.log_session': 'Log a session to second brain',
    'secondbrain.run_sync': 'Run second brain sync',
    'secondbrain.graduate': 'Graduate a fact to permanent memory',
    'secondbrain.promote': 'Promote a note to higher tier',
    'secondbrain.recall': 'Recall from second brain',
    'secondbrain.expand': 'Expand a concept in second brain',
    'secondbrain.remember': 'Force remember something',
    'secondbrain.timeline': 'Get second brain timeline',
    'secondbrain.audit': 'Audit second brain state',
    'secondbrain.inbox': 'Get second brain inbox',
    'secondbrain.next_moves': 'Get suggested next moves',
    'secondbrain.commitments': 'Get user commitments',
    'secondbrain.synthesize': 'Synthesize second brain insights',
    'secondbrain.remote_sync': 'Sync second brain remotely',
    'browseros.take_snapshot': 'Take accessibility snapshot of browser page',
    'browseros.take_enhanced_snapshot': 'Take enhanced snapshot with structural context',
    'browseros.take_screenshot': 'Take page screenshot',
    'browseros.click': 'Click element by ID from snapshot',
    'browseros.click_at': 'Click at specific coordinates',
    'browseros.double_click': 'Double-click element',
    'browseros.right_click': 'Right-click element',
    'browseros.fill': 'Type text into input element',
    'browseros.clear': 'Clear input element text',
    'browseros.select_option': 'Select dropdown option',
    'browseros.hover': 'Hover over element',
    'browseros.focus': 'Focus element',
    'browseros.press_key': 'Press key or key combination',
    'browseros.scroll': 'Scroll page or element',
    'browseros.drag': 'Drag from one element to another',
    'browseros.upload_file': 'Upload file to input element',
    'browseros.navigate': 'Navigate page to URL',
    'browseros.go_back': 'Go back in browser history',
    'browseros.go_forward': 'Go forward in browser history',
    'browseros.reload': 'Reload current page',
    'browseros.new_page': 'Open new tab',
    'browseros.new_hidden_page': 'Open hidden tab for background automation',
    'browseros.close_page': 'Close tab',
    'browseros.show_page': 'Restore hidden tab to visible window',
    'browseros.activate_window': 'Activate browser window',
    'browseros.create_window': 'Create new browser window',
    'browseros.create_hidden_window': 'Create hidden browser window',
    'browseros.close_window': 'Close browser window',
    'browseros.list_pages': 'List all open tabs',
    'browseros.list_windows': 'List all browser windows',
    'browseros.list_tab_groups': 'List all tab groups',
    'browseros.group_tabs': 'Group tabs together',
    'browseros.ungroup_tabs': 'Remove tabs from groups',
    'browseros.move_page': 'Move tab to different window',
    'browseros.update_tab_group': 'Update tab group title/color/collapsed',
    'browseros.close_tab_group': 'Close tab group and all its tabs',
    'browseros.get_active_page': 'Get currently active page',
    'browseros.get_page_content': 'Extract page content as markdown',
    'browseros.get_page_links': 'Extract all links from page',
    'browseros.get_dom': 'Get raw HTML DOM structure',
    'browseros.search_dom': 'Search DOM using CSS/XPath',
    'browseros.evaluate_script': 'Execute JavaScript in page context',
    'browseros.handle_dialog': 'Accept/dismiss JavaScript dialog',
    'browseros.check': 'Check checkbox or radio button',
    'browseros.uncheck': 'Uncheck checkbox',
    'browseros.get_bookmarks': 'List all bookmarks',
    'browseros.create_bookmark': 'Create bookmark or folder',
    'browseros.update_bookmark': 'Update bookmark title or URL',
    'browseros.move_bookmark': 'Move bookmark to different folder',
    'browseros.remove_bookmark': 'Remove bookmark by ID',
    'browseros.search_bookmarks': 'Search bookmarks by title or URL',
    'browseros.get_recent_history': 'Get recent browser history',
    'browseros.search_history': 'Search browser history',
    'browseros.delete_history_url': 'Delete URL from history',
    'browseros.delete_history_range': 'Delete history within time range',
    'browseros.save_pdf': 'Save page as PDF',
    'browseros.save_screenshot': 'Save page screenshot to disk',
    'browseros.download_file': 'Click element to trigger file download',
    'browseros.browseros_info': 'Get BrowserOS features and documentation',
    'browseros.discover_categories_or_actions': 'Discover available service categories',
    'browseros.get_category_actions': 'Get actions for a category',
    'browseros.get_action_details': 'Get parameter schema for action',
    'browseros.execute_action': 'Execute external service action',
    'browseros.search_documentation': 'Search documentation for action',
    'browseros.handle_auth_failure': 'Handle authentication failure',
    'browseros.suggest_app_connection': 'Suggest connecting an app',
    'browseros.suggest_schedule': 'Suggest scheduling a task',
  };
  return map[name] || `${category} tool: ${tool}`;
}

function getToolKeywords(name: string): string[] {
  const parts = name.split('.');
  const tool = parts[1];
  const category = parts[0];
  const base = [category, tool];
  const synonyms: Record<string, string[]> = {
    'recall': ['remember', 'memory', 'search', 'find'],
    'record': ['save', 'store', 'write', 'add', 'remember'],
    'search': ['find', 'query', 'lookup', 'search'],
    'episodes': ['events', 'history', 'past', 'memories'],
    'facts': ['knowledge', 'data', 'information'],
    'topics': ['interests', 'themes', 'subjects'],
    'graph': ['visual', 'network', 'connections'],
    'stats': ['statistics', 'usage', 'cost'],
    'tokens': ['usage', 'count', 'billing'],
    'budget': ['cost', 'limit', 'cap', 'spending'],
    'theme': ['appearance', 'ui', 'dark', 'light'],
    'list': ['show', 'display', 'get', 'fetch'],
    'read': ['view', 'open', 'get', 'fetch'],
    'create': ['new', 'make', 'add', 'build'],
    'append': ['add', 'extend', 'update'],
    'markdone': ['complete', 'finish', 'done'],
    'complete': ['finish', 'done', 'finish'],
    'take_snapshot': ['screenshot', 'capture', 'page'],
    'click': ['press', 'select', 'choose'],
    'fill': ['type', 'input', 'enter'],
    'navigate': ['go', 'open', 'visit', 'url'],
    'new_page': ['tab', 'open', 'new'],
    'execute_action': ['run', 'do', 'perform', 'action'],
    'save_screenshot': ['capture', 'image', 'png'],
    'save_pdf': ['export', 'pdf', 'document'],
    'download': ['save', 'export', 'file'],
  };
  const kw = synonyms[tool] || [];
  return [...base, ...kw];
}

function getToolParams(name: string): Record<string, string> {
  const map: Record<string, Record<string, string>> = {
    'memory.recall': { query: 'string', limit: 'number' },
    'memory.record': { key: 'string', value: 'string', confidence: 'number' },
    'memory.search': { query: 'string' },
    'memory.episodes': {},
    'memory.facts': {},
    'memory.topics': {},
    'memory.graph': {},
    'memory.topic.record': { topic: 'string', count: 'number' },
    'memory.episode.record': { title: 'string', detail: 'string', tags: 'array' },
    'memory.export': {},
    'chat.stats': {},
    'chat.tokens': {},
    'chat.budget': {},
    'chat.budget.set': { caps: 'object' },
    'chat.theme': { theme: 'string' },
    'goal.list': {},
    'goal.create': { title: 'string', steps: 'string' },
    'goal.markdone': { goalId: 'string', stepTitle: 'string' },
    'goal.complete': { goalId: 'string' },
    'browseros.take_snapshot': {},
    'browseros.click': { element: 'number', page: 'number' },
    'browseros.fill': { element: 'number', page: 'number', text: 'string' },
    'browseros.navigate': { page: 'number', url: 'string' },
  };
  return map[name] || {};
}

// Intent → category mapping for search
const INTENT_CATEGORY_MAP: Record<string, ToolCategory[]> = {
  'remember': ['memory'],
  'recall': ['memory'],
  'save': ['memory', 'secondbrain'],
  'store': ['memory', 'secondbrain'],
  'search': ['memory', 'secondbrain'],
  'find': ['memory', 'secondbrain'],
  'goal': ['goal'],
  'task': ['goal'],
  'plan': ['goal'],
  'browser': ['browseros'],
  'web': ['browseros'],
  'click': ['browseros'],
  'navigate': ['browseros'],
  'theme': ['chat'],
  'cost': ['chat'],
  'budget': ['chat'],
  'token': ['chat'],
  'note': ['secondbrain'],
  'knowledge': ['secondbrain'],
  'sync': ['secondbrain'],
  'screenshot': ['browseros'],
  'pdf': ['browseros'],
  'download': ['browseros'],
};

export function searchTools(query: string, limit = 12): ToolDef[] {
  const lowered = query.toLowerCase();
  const words = lowered.split(/[\s,;.!?]+/).filter((w) => w.length > 2);

  const scored = TOOL_DEFS.map((def) => {
    let score = 0;
    const nameLower = def.name.toLowerCase();
    const descLower = def.description.toLowerCase();

    // Exact match on tool name
    if (nameLower === lowered) score += 20;
    else if (nameLower.startsWith(lowered)) score += 10;
    else if (nameLower.includes(lowered)) score += 5;

    // Keyword matches
    for (const kw of def.keywords) {
      if (words.includes(kw.toLowerCase())) score += 3;
      if (descLower.includes(kw.toLowerCase())) score += 1;
    }

    // Intent mapping
    for (const word of words) {
      const categories = INTENT_CATEGORY_MAP[word];
      if (categories && categories.includes(def.category)) {
        score += 2;
      }
    }

    // Category boost if query matches category name
    if (words.includes(def.category)) score += 4;

    return { def, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.def);
}

export function getToolsByCategory(category: ToolCategory): ToolDef[] {
  return TOOL_DEFS.filter((def) => def.category === category);
}

export function getToolDef(name: string): ToolDef | undefined {
  return TOOL_DEFS.find((def) => def.name === name);
}

export function getAllToolNames(): string[] {
  return TOOL_DEFS.map((def) => def.name);
}

export function getToolCount(): number {
  return TOOL_DEFS.length;
}

export function buildToolManifest(selectedTools: string[]): Record<string, { description: string; params: Record<string, string> }> {
  const manifest: Record<string, { description: string; params: Record<string, string> }> = {};
  for (const name of selectedTools) {
    const def = TOOL_DEFS.find((d) => d.name === name);
    if (def) {
      manifest[name] = { description: def.description, params: def.params };
    }
  }
  return manifest;
}

// Reduce context bloat: return only tools relevant to the user's message
// plus a small set of always-included core tools.
const CORE_TOOLS = new Set([
  'memory.recall', 'memory.record', 'memory.search',
  'chat.theme', 'chat.budget',
]);

export function selectRelevantTools(userMessage: string, maxTools = 20): string[] {
  const relevant = searchTools(userMessage, maxTools);
  const selected = new Set<string>();

  // Always include core tools FIRST
  for (const core of CORE_TOOLS) {
    selected.add(core);
  }

  // Add relevant tools up to maxTools
  for (const def of relevant) {
    if (selected.size >= maxTools) break;
    selected.add(def.name);
  }

  return Array.from(selected);
}
