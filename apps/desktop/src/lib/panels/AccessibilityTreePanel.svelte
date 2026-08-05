<script lang="ts">
  import { extractAccessibilityTree, dumpAccessibilityTree, getElementAccessibility, type AccessibilityTree, type AccessibilityNode } from '$lib/accessibilityTree';
  import { logger } from '$lib/logger';

  let tree = $state<AccessibilityTree | null>(null);
  let selectedNode = $state<AccessibilityNode | null>(null);
  let isExtracting = $state(false);
  let error = $state<string | null>(null);

  async function handleExtract() {
    isExtracting = true;
    error = null;
    try {
      tree = await extractAccessibilityTree();
      selectedNode = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to extract accessibility tree';
      logger.error('[Accessibility] Extraction failed', { error: String(e) });
    } finally {
      isExtracting = false;
    }
  }

  async function handleDump() {
    await dumpAccessibilityTree();
  }

  function selectNode(node: AccessibilityNode) {
    selectedNode = selectedNode?.role === node.role && selectedNode?.name === node.name
      ? null
      : node;
  }

  function getNodePath(node: AccessibilityNode): string {
    const parts: string[] = [];
    let current: AccessibilityNode | null = node;
    while (current) {
      parts.unshift(`${current.role}${current.name ? `: ${current.name}` : ''}`);
      // In a real implementation, we'd track parent references
      break;
    }
    return parts.join(' > ');
  }

  function copyTree() {
    if (!tree) return;
    navigator.clipboard.writeText(JSON.stringify(tree, null, 2));
  }

  function downloadTree() {
    if (!tree) return;
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-tree-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function countNodes(node: AccessibilityNode): number {
    let count = 1;
    for (const child of node.children) {
      count += countNodes(child);
    }
    return count;
  }

  function getMaxDepth(node: AccessibilityNode): number {
    if (node.children.length === 0) return 1;
    return 1 + Math.max(...node.children.map(getMaxDepth));
  }

  function getRolesSummary(node: AccessibilityNode): Record<string, number> {
    const summary: Record<string, number> = {};
    function walk(n: AccessibilityNode) {
      summary[n.role] = (summary[n.role] || 0) + 1;
      for (const child of n.children) walk(child);
    }
    walk(node);
    return summary;
  }
</script>

<style>
  .a11y-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    height: 100%;
    font-family: var(--font-body);
    overflow: hidden;
  }

  .a11y-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--gb-border);
  }

  .a11y-header h2 {
    margin: 0;
    font-size: 14px;
    color: var(--gb-text);
  }

  .a11y-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .a11y-btn {
    padding: 6px 12px;
    background: var(--gb-bg);
    border: 2px solid var(--gb-border);
    color: var(--gb-text);
    font-family: var(--font-body);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .a11y-btn:hover:not(:disabled) { background: var(--gb-dark); color: var(--gb-bg); }
  .a11y-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .a11y-btn.secondary { border-color: var(--gb-border); background: var(--gb-bg); }
  .a11y-btn.secondary:hover:not(:disabled) { background: var(--accent-teal); border-color: var(--accent-teal); color: var(--gb-bg); }

  .a11y-error {
    padding: 8px 12px;
    background: #2a0000;
    border: 2px solid #e85050;
    color: #e85050;
    font-size: 11px;
    font-family: var(--font-body);
    border-radius: 4px;
  }

  .a11y-summary {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 8px 12px;
    background: var(--gb-panel);
    border: 1px solid var(--gb-border);
    border-radius: 4px;
    font-size: 11px;
    color: var(--gb-dark);
  }

  .a11y-roles {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .role-badge {
    padding: 2px 8px;
    background: var(--gb-bg);
    border: 1px solid var(--gb-border);
    color: var(--gb-dark);
    font-size: 10px;
    font-family: var(--font-body);
    border-radius: 3px;
  }

  .a11y-tree {
    flex: 1;
    overflow-y: auto;
    background: var(--gb-bg);
    border: 1px solid var(--gb-border);
    border-radius: 4px;
    padding: 8px;
    font-family: var(--font-body);
    font-size: 11px;
  }

  .a11y-tree-node {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.1s;
    user-select: none;
  }

  .a11y-tree-node:hover { background: var(--gb-border); }
  .a11y-tree-node.selected { background: var(--accent-teal); color: var(--gb-bg); }

  .a11y-node-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .a11y-node-role {
    font-weight: bold;
    color: var(--accent-teal);
    font-size: 10px;
    text-transform: uppercase;
  }

  .a11y-node-name {
    color: var(--gb-text);
    font-size: 11px;
  }

  .a11y-node-states {
    display: flex;
    gap: 2px;
    margin-left: 18px;
  }

  .state-badge {
    padding: 1px 4px;
    background: var(--accent-coral);
    color: var(--gb-bg);
    font-size: 8px;
    border-radius: 2px;
    text-transform: uppercase;
  }

  .a11y-node-children {
    margin-left: 18px;
    border-left: 1px solid var(--gb-border);
    padding-left: 8px;
  }

  .a11y-detail {
    padding: 12px;
    background: var(--gb-panel);
    border: 1px solid var(--gb-border);
    border-radius: 4px;
    font-family: var(--font-body);
    font-size: 11px;
  }

  .a11y-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--gb-border);
  }

  .a11y-detail-header h3 { margin: 0; font-size: 12px; }
  .close-btn {
    background: none;
    border: none;
    color: var(--gb-dark);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
  }
  .close-btn:hover { color: var(--accent-coral); }

  .a11y-field { margin-bottom: 8px; }
  .a11y-field label {
    display: block;
    font-size: 9px;
    color: var(--gb-dark);
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .a11y-field span { color: var(--gb-text); }
  .a11y-field code {
    background: var(--gb-bg);
    border: 1px solid var(--gb-border);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    color: var(--gb-text);
  }
  .a11y-field pre {
    margin: 4px 0 0;
    padding: 8px;
    background: var(--gb-bg);
    border: 1px solid var(--gb-border);
    border-radius: 3px;
    font-size: 9px;
    overflow: auto;
    max-height: 200px;
  }

  .states { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
  .state-badge {
    padding: 2px 6px;
    background: var(--gb-dark);
    color: var(--gb-bg);
    font-size: 8px;
    border-radius: 2px;
    text-transform: uppercase;
  }
</style>