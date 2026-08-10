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

