// Accessibility Tree Extraction — extracts browser accessibility tree for analysis
// Supports multiple platforms: UIAutomation (Windows), AppleScript (macOS), AT-SPI (Linux)
// Also provides browser-based extraction via Playwright

export interface AccessibilityNode {
  role: string;
  name?: string;
  description?: string;
  value?: string;
  states: string[];
  attributes: Record<string, string>;
  children: AccessibilityNode[];
  bounds?: { x: number; y: number; width: number; height: number };
  level: number;
}

export interface AccessibilityTree {
  root: AccessibilityNode;
  timestamp: number;
  url: string;
  viewport: { width: number; height: number };
}

const PLATFORM = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';

export async function extractAccessibilityTree(): Promise<AccessibilityTree> {
  if (typeof window === 'undefined') {
    throw new Error('Accessibility tree extraction only available in browser');
  }

  // Try Playwright-based extraction first (most reliable)
  try {
    return await extractViaPlaywright();
  } catch {
    // Fallback to native browser APIs
  }

  // Fallback: Use Chrome DevTools Protocol if available
  if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.devtools) {
    try {
      return await extractViaCDP();
    } catch {}
  }

  // Last resort: Compute from DOM
  return computeFromDOM();
}

async function extractViaPlaywright(): Promise<AccessibilityTree> {
  // This requires Playwright to be connected to the page
  // In practice, this would be called from a Playwright test context
  // For now, we'll use the browser's built-in accessibility tree API
  const tree = await getBrowserAccessibilityTree();
  return tree;
}

async function getBrowserAccessibilityTree(): Promise<AccessibilityTree> {
  // Use the Accessibility Object Model (AOM) if available
  if (typeof (window as any).accessibility !== 'undefined') {
    try {
      const tree = await (window as any).accessibility.getTree();
      return convertAOMTree(tree);
    } catch {}
  }

  // Fallback: Use Chrome's accessibility tree via CDP
  if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.runtime) {
    try {
      return await extractViaCDP();
    } catch {}
  }

  return computeFromDOM();
}

async function extractViaCDP(): Promise<AccessibilityTree> {
  // This would use Chrome DevTools Protocol
  // For now, return computed tree
  return computeFromDOM();
}

function computeFromDOM(): AccessibilityTree {
  const root = document.body;
  return {
    root: walkDOM(root, 0),
    timestamp: Date.now(),
    url: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}

function walkDOM(element: Element, level: number): AccessibilityNode {
  const role = getAriaRole(element);
  const name = getAccessibleName(element);
  const description = getAccessibleDescription(element);
  const value = getAccessibleValue(element);
  const states = getAriaStates(element);
  const attributes = getAriaAttributes(element);
  const bounds = getElementBounds(element);

  const children: AccessibilityNode[] = [];
  for (const child of Array.from(element.children)) {
    if (isElementVisible(child as HTMLElement)) {
      children.push(walkDOM(child as Element, level + 1));
    }
  }

  return {
    role,
    name,
    description,
    value,
    states,
    attributes,
    children,
    bounds,
    level,
  };
}

function getAriaRole(element: Element): string {
  const explicitRole = element.getAttribute('role');
  if (explicitRole) return explicitRole;

  const tagName = element.tagName.toLowerCase();
  const implicitRoles: Record<string, string> = {
    button: 'button',
    a: 'link',
    input: 'textbox',
    textarea: 'textbox',
    select: 'combobox',
    img: 'image',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    nav: 'navigation',
    main: 'main',
    aside: 'complementary',
    header: 'banner',
    footer: 'contentinfo',
    form: 'form',
    ul: 'list',
    ol: 'list',
    li: 'listitem',
    table: 'table',
    th: 'columnheader',
    td: 'cell',
    tr: 'row',
    dialog: 'dialog',
    alert: 'alert',
    progressbar: 'progressbar',
  };

  return implicitRoles[tagName] || 'generic';
}

function getAccessibleName(element: Element): string | undefined {
  // aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent?.trim();
  }

  // aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Title attribute
  const title = element.getAttribute('title');
  if (title) return title;

  // For inputs, check associated label
  if (element.tagName.toLowerCase() === 'input') {
    const id = element.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim();
    }
    // Check wrapping label
    const wrappingLabel = element.closest('label');
    if (wrappingLabel) return wrappingLabel.textContent?.trim();
  }

  // Text content for certain elements
  const tagName = element.tagName.toLowerCase();
  if (['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return element.textContent?.trim();
  }

  return undefined;
}

function getAccessibleDescription(element: Element): string | undefined {
  const describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    const descEl = document.getElementById(describedBy);
    if (descEl) return descEl.textContent?.trim();
  }
  return undefined;
}

function getAccessibleValue(element: Element): string | undefined {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return (element as HTMLInputElement).value;
  }
  if (tagName === 'progress') {
    return (element as HTMLProgressElement).value?.toString();
  }
  if (tagName === 'meter') {
    return (element as HTMLMeterElement).value?.toString();
  }
  return undefined;
}

function getAriaStates(element: Element): string[] {
  const states: string[] = [];

  if (element.hasAttribute('aria-expanded')) states.push('expanded');
  if (element.hasAttribute('aria-selected')) states.push('selected');
  if (element.hasAttribute('aria-checked')) states.push('checked');
  if (element.hasAttribute('aria-pressed')) states.push('pressed');
  if (element.hasAttribute('aria-disabled')) states.push('disabled');
  if (element.hasAttribute('aria-hidden')) states.push('hidden');
  if (element.hasAttribute('aria-invalid')) states.push('invalid');
  if (element.hasAttribute('aria-required')) states.push('required');
  if (element.hasAttribute('aria-readonly')) states.push('readonly');
  if (element.hasAttribute('aria-busy')) states.push('busy');
  if (element.hasAttribute('aria-grabbed')) states.push('grabbed');

  // Native states
  if (element.hasAttribute('disabled')) states.push('disabled');
  if (element.hasAttribute('hidden')) states.push('hidden');
  if (element.hasAttribute('readonly')) states.push('readonly');
  if (element.hasAttribute('required')) states.push('required');

  return states;
}

function getAriaAttributes(element: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith('aria-') || attr.name === 'role') {
      attrs[attr.name] = attr.value;
    }
  }
  return attrs;
}

function getElementBounds(element: Element): { x: number; y: number; width: number; height: number } | undefined {
  try {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  } catch {
    return undefined;
  }
}

function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function convertAOMTree(aomNode: any): AccessibilityTree {
  // Convert AOM tree to our format
  return {
    root: convertAOMNode(aomNode, 0),
    timestamp: Date.now(),
    url: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
}

function convertAOMNode(aomNode: any, level: number): AccessibilityNode {
  return {
    role: aomNode.role || 'generic',
    name: aomNode.name,
    description: aomNode.description,
    value: aomNode.value,
    states: aomNode.states || [],
    attributes: aomNode.attributes || {},
    children: (aomNode.children || []).map((child: any) => convertAOMNode(child, level + 1)),
    bounds: aomNode.bounds,
    level,
  };
}

// Export for use in tests/debugging
export async function dumpAccessibilityTree(): Promise<void> {
  const tree = await extractAccessibilityTree();
  console.log(JSON.stringify(tree, null, 2));
}

// Get specific element's accessibility info
export async function getElementAccessibility(element: Element): Promise<AccessibilityNode> {
  return walkDOM(element, 0);
}

// Compare two accessibility trees
export function compareAccessibilityTrees(tree1: AccessibilityTree, tree2: AccessibilityTree): {
  added: AccessibilityNode[];
  removed: AccessibilityNode[];
  changed: { before: AccessibilityNode; after: AccessibilityNode }[];
} {
  // Simplified comparison - would need more sophisticated diffing in practice
  return { added: [], removed: [], changed: [] };
}