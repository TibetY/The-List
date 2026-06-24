import { createTheme, type Theme } from '@mui/material/styles';

/**
 * Design tokens for the "The List" dashboard, ported from the
 * `The List - Dashboard.dc.html` handoff. Two palettes — a warm cream
 * "light" theme (the design default) and a deep green "dark" theme — drive
 * both the inline-styled page chrome and the MUI components in the
 * dashboard subtree.
 */
export type ListMode = 'light' | 'dark';

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
  divider: string;
  pillBorder: string;
  searchBg: string;
  accent: string;
  accentText: string;
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
    cardBg: '#ffffff',
    footerBg: '#F4ECDF',
    ink: '#2B2420',
    muted: '#8A7E70',
    faint: '#A89A86',
    chip: '#6F6353',
    border: '#E8DFD1',
    borderSoft: '#EFE7DA',
    divider: '#E8DFD1',
    pillBorder: '#E0D5C3',
    searchBg: '#F1E9DC',
    accent: '#C25E3C',
    accentText: '#ffffff',
    cost: '#5E6B47',
    rating: '#C25E3C',
    notRated: '#B7A893',
    monoGrad: 'linear-gradient(135deg,#EFE5D4,#E4D6C1)',
    monoInitial: 'rgba(194,94,60,.32)',
    beenBg: '#EBEFDD',
    beenFg: '#4A5639',
    wantBg: '#F6E2D8',
    wantFg: '#B0492A',
    avatar2: '#5E6B47',
    avatar3: '#E2D4BE',
    segBg: '#2B2420',
    segFg: '#FBF7F0',
    segIdle: '#8A7E70',
    pBg: '#C25E3C',
    pFg: '#ffffff',
    pIdle: '#8A7E70',
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
    divider: 'rgba(239,228,210,.12)',
    pillBorder: 'rgba(239,228,210,.14)',
    searchBg: '#1C2A23',
    accent: '#D9913F',
    accentText: '#15201B',
    cost: '#9FD3A6',
    rating: '#D9913F',
    notRated: '#6F806F',
    monoGrad: 'linear-gradient(135deg,#26342B,#1A241E)',
    monoInitial: 'rgba(217,145,63,.3)',
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
 * Build an MUI theme for the dashboard subtree (used for dialogs, buttons,
 * inputs, snackbars) so they match the warm cream / dark green palette.
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
      text: {
        primary: t.ink,
        secondary: t.muted,
      },
      divider: t.border,
      error: { main: '#C0492B' },
      success: { main: '#5E6B47' },
    },
    typography: {
      fontFamily: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'].join(
        ','
      ),
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            padding: '8px 18px',
          },
          contained: {
            boxShadow: 'none',
            backgroundColor: t.accent,
            color: t.accentText,
            '&:hover': {
              boxShadow: `0 4px 14px ${
                mode === 'light'
                  ? 'rgba(194,94,60,.3)'
                  : 'rgba(217,145,63,.3)'
              }`,
              backgroundColor: t.accent,
              filter: 'brightness(1.05)',
            },
          },
          outlined: {
            borderColor: t.pillBorder,
            color: t.ink,
            '&:hover': {
              borderColor: t.accent,
              backgroundColor: 'transparent',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: t.panelBg,
            backgroundImage: 'none',
            border: `1px solid ${t.border}`,
            borderRadius: 18,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: t.searchBg,
              '& fieldset': { borderColor: t.border },
              '&:hover fieldset': { borderColor: t.pillBorder },
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
