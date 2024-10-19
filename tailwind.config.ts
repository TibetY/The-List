import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: "#121212", // Background color
        primary: "#FFFFFF", // Main text color
        accent: "#1ABC9C", // Login link color
        "accent-hover": "#16A085", // Login link hover color
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"], // Sleek font
      },
    },
  },
  plugins: [],
} satisfies Config;
