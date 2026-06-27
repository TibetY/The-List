import { createTheme } from '@mui/material/styles';
import { listTokens, heroTokens } from '~/listTheme';

/**
 * Public-surface theme (landing, auth, nav, error pages). This is the brand's
 * "Supper" night mode — the SAME warm editorial system as the app, lit with
 * terracotta + amber over deep green-black, never cold #0a0a0f. Built from the
 * shared dark tokens so the two never drift apart, with a few marketing-only
 * extras (warm frosted glass, hero accents) exposed on the palette.
 */
const d = listTokens.dark;

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
    mode: 'dark',
    background: {
      default: d.pageBg,
      paper: d.cardBg,
    },
    primary: {
      main: d.accent,
      light: d.accentHover,
      dark: '#C77C34',
      contrastText: d.accentText,
    },
    secondary: {
      main: d.secondary,
    },
    accent: {
      main: d.accent,
      light: d.accentHover,
      dark: '#C77C34',
      contrastText: d.accentText,
    },
    glass: {
      background: heroTokens.glass,
      border: heroTokens.glassBorder,
      hover: 'rgba(243,234,217,0.08)',
    },
    hero: {
      background: heroTokens.bg,
      ink: heroTokens.ink,
      muted: heroTokens.muted,
      ember: heroTokens.ember,
    },
    text: {
      primary: d.ink,
      secondary: d.muted,
      disabled: d.faint,
    },
    error: { main: d.error },
    success: { main: d.success },
    divider: d.border,
  },
  typography: {
    fontFamily: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'].join(','),
    // Display is the serif, quiet — weight 400 only, never bold.
    h1: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400, letterSpacing: '-0.01em' },
    h2: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400, letterSpacing: '-0.01em' },
    h3: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
    h4: { fontFamily: ['Instrument Serif', 'serif'].join(','), fontWeight: 400 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: d.pageBg,
          color: d.ink,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(239,228,210,0.18) transparent',
        },
        '*:focus-visible': {
          // Terracotta reads on both the cream app and this warm-dark chrome.
          outline: '2px solid #B5532F',
          outlineOffset: '2px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 12,
          padding: '10px 22px',
          fontSize: '0.95rem',
          transition: 'all 0.2s ease',
          ...(ownerState.size !== 'small' ? { minHeight: 44 } : {}),
        }),
        contained: {
          backgroundColor: d.accent,
          color: d.accentText,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: d.accentHover,
            boxShadow: '0 6px 20px rgba(217,145,63,0.28)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: d.borderStrong,
          color: d.ink,
          '&:hover': {
            borderColor: d.accent,
            backgroundColor: 'rgba(217,145,63,0.08)',
          },
        },
        text: {
          color: d.ink,
          '&:hover': { backgroundColor: 'rgba(243,234,217,0.06)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: heroTokens.glass,
          backdropFilter: 'blur(16px)',
          border: `1px solid ${heroTokens.glassBorder}`,
          borderRadius: 20,
          transition: 'all 0.3s ease',
          '&:hover': {
            border: '1px solid rgba(243,234,217,0.2)',
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: d.cardBg,
          backgroundImage: 'none',
          border: `1px solid ${d.border}`,
          borderRadius: 16,
          boxShadow: d.shadow3,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: d.field,
            '& fieldset': { borderColor: d.fieldBorder },
            '&:hover fieldset': { borderColor: d.borderStrong },
            '&.Mui-focused fieldset': { borderColor: d.accent },
          },
          '& .MuiInputLabel-root': { color: d.muted },
          '& .MuiInputLabel-root.Mui-focused': { color: d.accent },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(14,21,13,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${d.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: { color: d.rating },
        iconHover: { color: d.accentHover },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

export default theme;
