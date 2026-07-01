import { createTheme, type Theme } from '@mui/material/styles';

/**
 * Single source of truth for "The List" brand — the warm editorial system from
 * the Brand & Product System handoff. Two modes of ONE brand: a cream
 * "Daylight" (light) palette and a deep-green "Supper" (dark) palette. These
 * tokens drive the dashboard chrome, every MUI component in the app subtree,
 * AND (via theme.ts, which builds on the dark palette + heroTokens) the
 * marketing and auth pages, so the product reads as one table end to end.
 */
export type ListMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'thelist.theme';

/** Read the user's saved theme preference (client only; defaults to light). */
export function getStoredMode(): ListMode {
  if (typeof window === 'undefined') return 'light';
  const v = window.localStorage.getItem(THEME_STORAGE_KEY);
  return v === 'dark' || v === 'light' ? v : 'light';
}

/** Persist the user's theme preference so it survives navigation/reloads. */
export function storeMode(mode: ListMode): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
}

export interface ListTokens {
  pageBg: string;
  panelBg: string;
  cardBg: string;
  footerBg: string;
  ink: string;
  muted: string;
  faint: string;
  chip: string;
  border: string;
  borderSoft: string;
  borderStrong: string;
  divider: string;
  pillBorder: string;
  field: string;
  fieldBorder: string;
  searchBg: string;
  accent: string;
  accentHover: string;
  accentText: string;
  ember: string;
  secondary: string;
  success: string;
  error: string;
  cost: string;
  rating: string;
  notRated: string;
  monoGrad: string;
  monoInitial: string;
  beenBg: string;
  beenFg: string;
  wantBg: string;
  wantFg: string;
  avatar2: string;
  avatar3: string;
  segBg: string;
  segFg: string;
  segIdle: string;
  pBg: string;
  pFg: string;
  pIdle: string;
  ring: string;
  // Stronger accent halo for the "just auto-filled" moment (box-shadow-ready).
  glow: string;
  // Neutral base for loading skeletons (search results, resolving cards).
  skeleton: string;
  snackBg: string;
  snackFg: string;
  shadow1: string;
  shadow2: string;
  shadow3: string;
  mapBg: string;
  mapGrid: string;
  mapWater: string;
  mapPark: string;
  pinBorder: string;
  pinLabelBg: string;
  pinLabelFg: string;
  pinLabelBorder: string;
}

export const listTokens: Record<ListMode, ListTokens> = {
  light: {
    pageBg: '#EFE7D8',
    panelBg: '#FBF7F0',
    cardBg: '#FFFFFF',
    footerBg: '#F4ECDF',
    ink: '#2B2420',
    muted: '#6F6353',
    faint: '#8A7E70',
    chip: '#6F6353',
    border: '#E8DFD1',
    borderSoft: '#EFE7DA',
    borderStrong: '#E0D5C3',
    divider: '#E8DFD1',
    pillBorder: '#E0D5C3',
    field: '#FFFFFF',
    fieldBorder: '#E0D5C3',
    searchBg: '#F1E9DC',
    accent: '#B5532F',
    accentHover: '#9C4427',
    accentText: '#FFFFFF',
    ember: 'linear-gradient(135deg,#C2603B,#A8472A)',
    secondary: '#5E6B47',
    success: '#3F7A43',
    error: '#B23B2E',
    cost: '#5E6B47',
    rating: '#B5532F',
    notRated: '#B7A893',
    monoGrad: 'linear-gradient(135deg,#E7D6BD,#D9C4A4)',
    monoInitial: 'rgba(181,83,47,.30)',
    beenBg: '#EBEFDD',
    beenFg: '#4A5639',
    wantBg: '#F6E2D8',
    wantFg: '#9E4327',
    avatar2: '#5E6B47',
    avatar3: '#E2D4BE',
    segBg: '#2B2420',
    segFg: '#FBF7F0',
    segIdle: '#6F6353',
    pBg: '#B5532F',
    pFg: '#FFFFFF',
    pIdle: '#6F6353',
    ring: 'rgba(181,83,47,.22)',
    glow: 'rgba(181,83,47,.32)',
    skeleton: 'rgba(120,110,95,.14)',
    snackBg: '#2B2420',
    snackFg: '#F3EADB',
    shadow1: '0 1px 3px rgba(43,36,32,.08)',
    shadow2: '0 8px 24px rgba(43,36,32,.12)',
    shadow3: '0 24px 60px rgba(43,36,32,.22)',
    mapBg: '#EFE7D8',
    mapGrid: 'rgba(180,165,140,.18)',
    mapWater: 'rgba(120,150,170,.25)',
    mapPark: 'rgba(150,170,130,.22)',
    pinBorder: '#ffffff',
    pinLabelBg: '#ffffff',
    pinLabelFg: '#2B2420',
    pinLabelBorder: '#E8DFD1',
  },
  dark: {
    pageBg: '#0E150D',
    panelBg: '#15201B',
    cardBg: '#1C2A23',
    footerBg: '#11190E',
    ink: '#EFE7D6',
    muted: '#92A492',
    faint: '#7E907E',
    chip: '#92A492',
    border: 'rgba(239,228,210,.1)',
    borderSoft: 'rgba(239,228,210,.07)',
    borderStrong: 'rgba(239,228,210,.16)',
    divider: 'rgba(239,228,210,.12)',
    pillBorder: 'rgba(239,228,210,.14)',
    field: '#15201B',
    fieldBorder: 'rgba(239,228,210,.16)',
    searchBg: '#1C2A23',
    accent: '#D9913F',
    accentHover: '#E6A555',
    accentText: '#15201B',
    ember: 'linear-gradient(135deg,#E0A85C,#C77C34)',
    secondary: '#9FD3A6',
    success: '#9FD3A6',
    error: '#E8857A',
    cost: '#9FD3A6',
    rating: '#D9913F',
    notRated: '#6F806F',
    monoGrad: 'linear-gradient(135deg,#2A3A2F,#1A241E)',
    monoInitial: 'rgba(217,145,63,.30)',
    beenBg: '#24402F',
    beenFg: '#9FD3A6',
    wantBg: '#3A2A1A',
    wantFg: '#E0A85C',
    avatar2: '#4F7A5A',
    avatar3: '#2F3E33',
    segBg: '#EDE4D2',
    segFg: '#15201B',
    segIdle: '#8FA08F',
    pBg: '#D9913F',
    pFg: '#15201B',
    pIdle: '#8FA08F',
    ring: 'rgba(217,145,63,.3)',
    glow: 'rgba(217,145,63,.42)',
    skeleton: 'rgba(239,228,210,.08)',
    snackBg: '#EDE4D2',
    snackFg: '#1C2A23',
    shadow1: '0 1px 3px rgba(0,0,0,.4)',
    shadow2: '0 8px 24px rgba(0,0,0,.45)',
    shadow3: '0 24px 60px rgba(0,0,0,.55)',
    mapBg: '#10180F',
    mapGrid: 'rgba(150,170,130,.08)',
    mapWater: 'rgba(90,120,140,.18)',
    mapPark: 'rgba(120,150,110,.14)',
    pinBorder: '#15201B',
    pinLabelBg: '#1C2A23',
    pinLabelFg: '#EFE7D6',
    pinLabelBorder: 'rgba(239,228,210,.14)',
  },
};

/**
 * Warm-dark "hero" treatment for marketing/auth drama — the same Supper palette
 * lit with terracotta + amber radial glows instead of cold near-black. Used by
 * the landing hero and the sign-up bridge so the first impression is already
 * the app's night mode, never a different brand.
 */
export const heroTokens = {
  bg:
    'radial-gradient(120% 120% at 12% 8%, rgba(181,83,47,.34), transparent 46%),' +
    ' radial-gradient(110% 110% at 92% 96%, rgba(217,145,63,.22), transparent 52%), #0E150D',
  ink: '#F3EAD9',
  muted: '#B9AE9B',
  glass: 'rgba(243,234,217,.05)',
  glassBorder: 'rgba(243,234,217,.12)',
  ember: 'linear-gradient(135deg,#C2603B,#A8472A)',
};

/**
 * The semantic-token names the brand exposes as CSS custom properties, mapped to
 * the fields on ListTokens. This is the single mapping that produces tokens.css
 * (via brandCssVars) so the CSS layer is GENERATED from the same source as the
 * MUI theme — they can never drift apart.
 */
const CSS_VAR_MAP: [cssVar: string, token: keyof ListTokens][] = [
  ['--bg', 'pageBg'],
  ['--surface', 'panelBg'],
  ['--raised', 'cardBg'],
  ['--footer', 'footerBg'],
  ['--ink', 'ink'],
  ['--muted', 'muted'],
  ['--faint', 'faint'],
  ['--border', 'border'],
  ['--border-soft', 'borderSoft'],
  ['--border-strong', 'borderStrong'],
  ['--field', 'field'],
  ['--field-border', 'fieldBorder'],
  ['--search-bg', 'searchBg'],
  ['--accent', 'accent'],
  ['--accent-hover', 'accentHover'],
  ['--accent-text', 'accentText'],
  ['--ember', 'ember'],
  ['--secondary', 'secondary'],
  ['--success', 'success'],
  ['--error', 'error'],
  ['--rating', 'rating'],
  ['--cost', 'cost'],
  ['--not-rated', 'notRated'],
  ['--been-bg', 'beenBg'],
  ['--been-fg', 'beenFg'],
  ['--want-bg', 'wantBg'],
  ['--want-fg', 'wantFg'],
  ['--ring', 'ring'],
  ['--glow', 'glow'],
  ['--skeleton', 'skeleton'],
  ['--snack-bg', 'snackBg'],
  ['--snack-fg', 'snackFg'],
  ['--shadow-1', 'shadow1'],
  ['--shadow-2', 'shadow2'],
  ['--shadow-3', 'shadow3'],
];

/**
 * Generate the brand's CSS custom properties for both modes, scoped to
 * [data-theme]. Inject once (see root.tsx); any element carrying
 * data-theme="light|dark" then exposes --accent, --surface, … to Tailwind /
 * Emotion / plain CSS. Derived from listTokens, so it tracks the MUI theme.
 */
export function brandCssVars(): string {
  const block = (mode: ListMode) =>
    CSS_VAR_MAP.map(([cssVar, token]) => `${cssVar}:${listTokens[mode][token]}`).join(';');
  const statics = '--radius:12px;--radius-pill:999px;--space:4px';
  return (
    `:root,[data-theme="light"]{${block('light')};${statics}}` +
    `[data-theme="dark"]{${block('dark')}}`
  );
}

/**
 * Build an MUI theme for a brand mode. Used for the dashboard subtree (dialogs,
 * buttons, inputs, snackbars) and, via theme.ts, the public pages. Buttons are
 * soft rectangles (radius 12); pills are reserved for selection controls, which
 * are styled inline where they're used.
 */
export function makeListTheme(mode: ListMode): Theme {
  const t = listTokens[mode];

  return createTheme({
    palette: {
      mode,
      background: {
        default: t.pageBg,
        paper: t.cardBg,
      },
      primary: {
        main: t.accent,
        contrastText: t.accentText,
      },
      secondary: {
        main: t.secondary,
      },
      text: {
        primary: t.ink,
        secondary: t.muted,
        disabled: t.faint,
      },
      divider: t.border,
      error: { main: t.error },
      success: { main: t.success },
    },
    typography: {
      fontFamily: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'].join(
        ','
      ),
      // Display type is the serif, quiet (weight 400 only) — never bold the serif.
      h1: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
      h2: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
      h3: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
      h4: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    spacing: 4,
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            borderRadius: 12,
            padding: '9px 18px',
            // ≥44px tap target for primary actions; small buttons stay compact.
            ...(ownerState.size !== 'small' ? { minHeight: 44 } : {}),
          }),
          contained: {
            boxShadow: 'none',
            backgroundColor: t.accent,
            color: t.accentText,
            '&:hover': {
              boxShadow: 'none',
              backgroundColor: t.accentHover,
            },
          },
          outlined: {
            borderColor: t.borderStrong,
            color: t.ink,
            '&:hover': {
              borderColor: t.accent,
              backgroundColor: 'transparent',
            },
          },
          text: {
            color: t.accent,
            '&:hover': { backgroundColor: 'transparent' },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: t.panelBg,
            backgroundImage: 'none',
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            boxShadow: t.shadow3,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadow2,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: t.field,
              '& fieldset': { borderColor: t.fieldBorder },
              '&:hover fieldset': { borderColor: t.borderStrong },
              '&.Mui-focused fieldset': { borderColor: t.accent },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: t.accent },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 500 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
      MuiRating: {
        styleOverrides: {
          iconFilled: { color: t.rating },
          iconHover: { color: t.rating },
        },
      },
    },
  });
}
