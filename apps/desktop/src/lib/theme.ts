// Theme loader — applies a theme name to <html data-theme="..."> and persists
// in localStorage. Pure logic + browser glue.

export type ThemeName = 'gb' | 'gb-night' | 'gb-dawn';

export const THEMES: ThemeName[] = ['gb', 'gb-night', 'gb-dawn'];

export const THEME_STORAGE_KEY = 'agenmonster_theme';

export function loadTheme(): ThemeName {
  if (typeof localStorage === 'undefined') return 'gb';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'gb-night' || raw === 'gb-dawn') return raw;
  } catch {}
  return 'gb';
}

export function saveTheme(t: ThemeName): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, t);
  } catch {}
}

export function applyTheme(t: ThemeName): void {
  if (typeof document === 'undefined') return;
  if (t === 'gb') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export function describeTheme(t: ThemeName): string {
  if (t === 'gb') return 'GB default (green)';
  if (t === 'gb-night') return 'GB night (dark)';
  return 'GB dawn (warm)';
}
