// Color Blind Accessibility Support
// Provides color vision deficiency simulations and corrections

export type ColorBlindType = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' | 'protanomaly' | 'deuteranomaly' | 'tritanomaly' | 'coneMonochromacy';

export const COLOR_BLIND_TYPES: Record<string, { name: string; hueShift: number; saturation: number; contrast?: number; description: string }> = {
  none: { name: 'Normal', hueShift: 0, saturation: 1, description: 'Normal color vision' },
  protanopia: { name: 'Protanopia', hueShift: -15, saturation: 0.85, description: 'Red-blind (no red cones)' },
  deuteranopia: { name: 'Deuteranopia', hueShift: 15, saturation: 0.85, description: 'Green-blind (no green cones)' },
  tritanopia: { name: 'Tritanopia', hueShift: 90, saturation: 0.8, description: 'Blue-blind (no blue cones)' },
  achromatopsia: { name: 'Achromatopsia', hueShift: 0, saturation: 0, contrast: 1.3, description: 'Total color blindness (monochrome)' },
  protanomaly: { name: 'Protanomaly', hueShift: -8, saturation: 0.92, description: 'Red-weak (reduced red sensitivity)' },
  deuteranomaly: { name: 'Deuteranomaly', hueShift: 8, saturation: 0.92, description: 'Green-weak (reduced green sensitivity)' },
  tritanomaly: { name: 'Tritanomaly', hueShift: 45, saturation: 0.9, description: 'Blue-weak (reduced blue sensitivity)' },
  coneMonochromacy: { name: 'Cone Monochromacy', hueShift: 0, saturation: 0.1, contrast: 1.2, description: 'Single cone type functioning' }
};

export const COLOR_BLIND_STORAGE_KEY = 'agenmonster_color_blind';

export function loadColorBlind(): string {
  if (typeof localStorage === 'undefined') return 'none';
  try {
    const raw = localStorage.getItem(COLOR_BLIND_STORAGE_KEY);
    if (raw && raw in COLOR_BLIND_TYPES) return raw;
  } catch {}
  return 'none';
}

export function saveColorBlind(type: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(COLOR_BLIND_STORAGE_KEY, type);
  } catch {}
}

export function applyColorBlind(type: string): void {
  if (typeof document === 'undefined') return;
  
  const config = COLOR_BLIND_TYPES[type];
  if (!config) return;
  
  const root = document.documentElement;
  
  if (type === 'none') {
    root.style.removeProperty('--cb-hue-shift');
    root.style.removeProperty('--cb-saturation');
    root.style.removeProperty('--cb-contrast');
    root.classList.remove('color-blind');
  } else {
    root.style.setProperty('--cb-hue-shift', `${config.hueShift}deg`);
    root.style.setProperty('--cb-saturation', config.saturation.toString());
    if (config.contrast) {
      root.style.setProperty('--cb-contrast', config.contrast.toString());
    }
    root.classList.add('color-blind');
    root.classList.add(`color-blind-${type}`);
  }
}

// CSS Filter generation for color blind simulation
export function getColorBlindFilter(type: string): string {
  const config = COLOR_BLIND_TYPES[type];
  if (!config || type === 'none') return 'none';
  
  // These are approximate CSS filter approximations
  // For production, use a proper color matrix transformation
  switch (type) {
    case 'protanopia':
      return 'sepia(0.5) saturate(0.7) hue-rotate(-15deg)';
    case 'deuteranopia':
      return 'sepia(0.5) saturate(0.7) hue-rotate(15deg)';
    case 'tritanopia':
      return 'saturate(0.8) hue-rotate(90deg)';
    case 'achromatopsia':
      return 'grayscale(1) contrast(1.3)';
    case 'protanomaly':
      return 'sepia(0.3) saturate(0.9) hue-rotate(-8deg)';
    case 'deuteranomaly':
      return 'sepia(0.3) saturate(0.9) hue-rotate(8deg)';
    case 'tritanomaly':
      return 'saturate(0.9) hue-rotate(45deg)';
    case 'coneMonochromacy':
      return 'grayscale(0.9) contrast(1.2)';
    default:
      return 'none';
  }
}

// Apply color blind filter to specific element (for testing/previews)
export function applyColorBlindToElement(element: HTMLElement, type: string): void {
  if (type === 'none') {
    element.style.filter = '';
    element.style.webkitFilter = '';
  } else {
    const filter = getColorBlindFilter(type);
    element.style.filter = filter;
    element.style.webkitFilter = filter;
  }
}

// Color matrix for precise color blind transformation (WebGL shader compatible)
export const COLOR_BLIND_MATRICES: Record<string, number[]> = {
  protanopia: [
    0.567, 0.433, 0, 0,
    0.558, 0.442, 0, 0,
    0, 0.242, 0.758, 0,
    0, 0, 0, 1
  ],
  deuteranopia: [
    0.625, 0.375, 0, 0,
    0.7, 0.3, 0, 0,
    0, 0.3, 0.7, 0,
    0, 0, 0, 1
  ],
  tritanopia: [
    0.95, 0.05, 0, 0,
    0, 0.433, 0.567, 0,
    0, 0.475, 0.525, 0,
    0, 0, 0, 1
  ],
  achromatopsia: [
    0.299, 0.587, 0.114, 0,
    0.299, 0.587, 0.114, 0,
    0.299, 0.587, 0.114, 0,
    0, 0, 0, 1
  ]
};

// Generate fragment shader for color blind correction
export function generateColorBlindShader(type: string): string {
  const matrix = COLOR_BLIND_MATRICES[type];
  if (!matrix) return '';
  
  return `
    uniform sampler2D uTexture;
    varying vec2 vTexCoord;
    
    void main() {
      vec4 color = texture2D(uTexture, vTexCoord);
      vec3 rgb = color.rgb;
      
      // Apply color blind transformation matrix
      vec3 transformed = vec3(
        dot(vec3(${matrix[0]}, ${matrix[1]}, ${matrix[2]}), rgb),
        dot(vec3(${matrix[4]}, ${matrix[5]}, ${matrix[6]}), rgb),
        dot(vec3(${matrix[8]}, ${matrix[9]}, ${matrix[10]}), rgb)
      );
      
      gl_FragColor = vec4(transformed, color.a);
    }
  `;
}

export function isColorBlindEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const type = localStorage.getItem('agenmonster_color_blind');
  return type !== null && type !== 'none';
}

export function getColorBlindDescription(type: string): string {
  return COLOR_BLIND_TYPES[type]?.description || 'Unknown';
}