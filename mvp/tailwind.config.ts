import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F8FB',
        surface: { DEFAULT: '#FFFFFF', alt: '#EEF2F7' },
        line: { DEFAULT: '#DCE3EC', strong: '#C2CDDA' },
        ink: {
          DEFAULT: '#2A3744',
          strong: '#0F1A26',
          muted: '#5E6E7E',
          subtle: '#8A98A6',
        },
        primary: {
          DEFAULT: '#1C5BBE',
          hover: '#154A9C',
          soft: '#EAF1FB',
        },
        horizon: {
          'open-fg': '#2F6BD6',
          'open-bg': '#EAF0FE',
          'narrow-fg': '#9A6614',
          'narrow-bg': '#FBF1DF',
          'frozen-fg': '#33495C',
          'frozen-bg': '#E6EEF2',
        },
        success: '#1E8E5A',
        warning: '#C8821A',
        critical: { DEFAULT: '#BC3B2E', soft: '#FBECEA' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
      },
      borderColor: {
        DEFAULT: '#DCE3EC',
      },
      boxShadow: {
        overlay: '0 4px 16px rgba(15,26,38,.10)',
      },
      letterSpacing: {
        label: '0.04em',
      },
    },
  },
  plugins: [],
};
export default config;
