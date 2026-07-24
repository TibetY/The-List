import { createTheme } from '@mui/material/styles';
import { listTokens, heroTokens, roundedFont } from '~/listTheme';

/**
 * Public-surface theme (landing, auth, nav, error pages). This is the brand's
 * "Daylight" washi mode — airy cream paper, ink text, terracotta as the single
 * accent, buttons as soft pills. Built from the shared light tokens so the
 * public pages and the app never drift apart, with a few marketing-only
 * extras (floating white cards, hero washes) exposed on the palette.
 */
const l = listTokens.light;

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
    glass: {
      background: string;
      border: string;
      hover: string;
    };
    hero: {
      background: string;
      ink: string;
      muted: string;
      ember: string;
    };
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
    glass?: {
      background: string;
      border: string;
      hover: string;
    };
    hero?: {
      background: string;
      ink: string;
      muted: string;
      ember: string;
    };
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: l.pageBg,
      paper: l.cardBg,
    },
    primary: {
      main: l.accent,
      light: '#C2603B',
      dark: l.accentHover,
      contrastText: l.accentText,
    },
    secondary: {
      main: l.secondary,
    },
    accent: {
      main: l.accent,
      light: '#C2603B',
      dark: l.accentHover,
      contrastText: l.accentText,
    },
    glass: {
      background: heroTokens.glass,
      border: heroTokens.glassBorder,
      hover: '#FFFDF9',
    },
    hero: {
      background: heroTokens.bg,
      ink: heroTokens.ink,
      muted: heroTokens.muted,
      ember: heroTokens.ember,
    },
    text: {
      primary: l.ink,
      secondary: l.muted,
      disabled: l.faint,
    },
    error: { main: l.error },
    success: { main: l.success },
    divider: l.border,
  },
  typography: {
    fontFamily: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'].join(','),
    // Display is the serif, quiet — weight 400 only, never bold.
    h1: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400, letterSpacing: '-0.01em' },
    h2: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400, letterSpacing: '-0.01em' },
    h3: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
    h4: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
    h5: { fontFamily: roundedFont, fontWeight: 700 },
    h6: { fontFamily: roundedFont, fontWeight: 700 },
    button: {
      fontFamily: roundedFont,
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: l.pageBg,
          color: l.ink,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(43,36,32,0.18) transparent',
        },
        '*:focus-visible': {
          // Terracotta reads on both the cream chrome and the Supper app mode.
          outline: '2px solid #B5532F',
          outlineOffset: '2px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 999,
          padding: '10px 24px',
          fontSize: '0.95rem',
          transition: 'transform .12s ease, background-color .15s ease, border-color .15s ease, box-shadow .15s ease',
          '&:active': { transform: 'scale(.97)' },
          ...(ownerState.size !== 'small' ? { minHeight: 44 } : {}),
        }),
        contained: {
          backgroundColor: l.accent,
          color: l.accentText,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: l.accentHover,
            boxShadow: '0 10px 24px -12px rgba(181,83,47,.5)',
          },
        },
        outlined: {
          borderColor: l.borderStrong,
          color: l.ink,
          '&:hover': {
            borderColor: l.accent,
            backgroundColor: 'rgba(181,83,47,0.06)',
          },
        },
        text: {
          color: l.ink,
          '&:hover': { backgroundColor: 'rgba(43,36,32,0.05)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: heroTokens.glass,
          border: `1px solid ${heroTokens.glassBorder}`,
          borderRadius: 22,
          boxShadow: l.bubbleShadow,
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: l.shadow2,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: l.panelBg,
          backgroundImage: 'none',
          border: `1px solid ${l.border}`,
          borderRadius: 22,
          boxShadow: l.shadow3,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: l.field,
            '& fieldset': { borderColor: l.fieldBorder },
            '&:hover fieldset': { borderColor: l.borderStrong },
            '&.Mui-focused fieldset': { borderColor: l.accent },
          },
          '& .MuiInputLabel-root': { color: l.muted },
          '& .MuiInputLabel-root.Mui-focused': { color: l.accent },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontFamily: roundedFont, fontWeight: 600 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(246,240,228,0.82)',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${l.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: { color: l.rating },
        iconHover: { color: l.accentHover },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 16 },
      },
    },
  },
});

export default theme;
