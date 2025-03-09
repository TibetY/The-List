import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
    accentHover: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
    accentHover?: PaletteOptions['primary'];
  }
}

const theme = createTheme({
  palette: {
    // Use this for backgrounds where needed.
    background: {
      default: '#1a202c', 
    },
    // Use primary for text-primary (or adjust as desired)
    primary: {
      main: '#ffffff',
    },
    // Custom accent colors
    accent: {
      main: '#F59E0B', // example: a warm amber tone
    },
    accentHover: {
      main: '#D97706', // a slightly darker amber for hover
    },
  },
  typography: {
    fontFamily: ['Roboto', 'sans-serif'].join(','),
  },
});

export default theme;
