import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
    accentHover: Palette['primary'];
    glass: {
      background: string;
      border: string;
      hover: string;
    };
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
    accentHover?: PaletteOptions['primary'];
    glass?: {
      background: string;
      border: string;
      hover: string;
    };
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0a0a0f',
      paper: '#141420',
    },
    primary: {
      main: '#E8734A',
      light: '#F2956F',
      dark: '#C45A35',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    accent: {
      main: '#E8734A',
      light: '#F2956F',
      dark: '#C45A35',
      contrastText: '#ffffff',
    },
    accentHover: {
      main: '#F2956F',
      light: '#F7B89A',
      dark: '#E8734A',
      contrastText: '#ffffff',
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.04)',
      border: 'rgba(255, 255, 255, 0.08)',
      hover: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#F5F5F7',
      secondary: '#A1A1AA',
    },
    error: {
      main: '#EF4444',
    },
    success: {
      main: '#22C55E',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', '-apple-system', 'sans-serif'].join(','),
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0a0f',
          color: '#F5F5F7',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        },
        '*:focus-visible': {
          outline: '2px solid #E8734A',
          outlineOffset: '2px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          transition: 'all 0.2s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #E8734A 0%, #C45A35 100%)',
          boxShadow: '0 4px 15px rgba(232, 115, 74, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #F2956F 0%, #E8734A 100%)',
            boxShadow: '0 6px 20px rgba(232, 115, 74, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.15)',
          '&:hover': {
            borderColor: '#E8734A',
            backgroundColor: 'rgba(232, 115, 74, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          transition: 'all 0.3s ease',
          '&:hover': {
            border: '1px solid rgba(255, 255, 255, 0.15)',
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#1a1a2e',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#E8734A',
            },
          },
          '& .MuiFilledInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#A1A1AA',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: 'none',
        },
      },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: {
          color: '#E8734A',
        },
        iconHover: {
          color: '#F2956F',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;
