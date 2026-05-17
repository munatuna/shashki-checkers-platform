import { create } from 'zustand';

export const DARK = {
  bg:          '#262522',
  surface:     '#302e2b',
  surface2:    '#1e1c1a',
  text:        '#e8e6e3',
  textSub:     '#c4c0bb',
  muted:       '#999693',
  dim:         '#666462',
  border:      '#2d2b27',
  border2:     '#3d3a36',
  border3:     '#4a4845',
  green:       '#81b64c',
  greenDark:   '#1d3320',
  greenMid:    '#2a4a2e',
  greenAlpha:  '#81b64c33',
  orange:      '#e8a020',
  orangeDark:  '#2d2200',
  red:         '#e04e4e',
  blue:        '#5b8dd9',
  card:        '0 4px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)',
  topBar:      '0 2px 8px rgba(0,0,0,0.25)',
} as const;

export const LIGHT = {
  bg:          '#f0ece6',
  surface:     '#ffffff',
  surface2:    '#f7f4f0',
  text:        '#1a1917',
  textSub:     '#3d3a36',
  muted:       '#5c5956',
  dim:         '#9a9693',
  border:      '#e8e4de',
  border2:     '#d8d4ce',
  border3:     '#c0bbb5',
  green:       '#538a28',
  greenDark:   '#e8f4d9',
  greenMid:    '#d4eab8',
  greenAlpha:  '#538a2833',
  orange:      '#b86a00',
  orangeDark:  '#fff3e0',
  red:         '#c73c3c',
  blue:        '#2563a8',
  card:        '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
  topBar:      '0 2px 8px rgba(0,0,0,0.07)',
} as const;

export type Theme = typeof DARK;

function getInitial(): boolean {
  try {
    const saved = localStorage.getItem('shashki-theme');
    const isDark = saved !== 'light';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    return isDark;
  } catch {
    return true;
  }
}

interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDark: getInitial(),
  toggle: () => {
    const next = !get().isDark;
    set({ isDark: next });
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('shashki-theme', next ? 'dark' : 'light'); } catch { /* */ }
  },
}));

export function useT(): Theme {
  const { isDark } = useThemeStore();
  return isDark ? DARK : LIGHT;
}
