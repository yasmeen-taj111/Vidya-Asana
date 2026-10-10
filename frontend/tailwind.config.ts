import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#E8592A',
          blue: '#2B5BE0',
          navy: '#17306A',
          dark: '#0f172a',
          light: '#EEF3FF',
        },
        primary: {
          DEFAULT: '#2B5BE0',
          hover: '#2248b8',
          light: '#EEF3FF',
        },
        navy: {
          DEFAULT: '#17306A',
          dark: '#0e1e44',
          light: '#25448c',
        },
        accent: {
          DEFAULT: '#E8602C',
          hover: '#cb4f20',
          light: '#FFF2EC',
        },
        teal: {
          DEFAULT: '#3F8F85',
          dark: '#2c6861',
          light: '#EBF6F4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
