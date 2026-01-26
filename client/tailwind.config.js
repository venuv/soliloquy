/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paper': '#fdfcf8',
        'ink': {
          DEFAULT: '#1a1a1a',
          light: '#4a4a4a',
          faint: '#9a9a9a',
        },
        'crimson': '#9b2d30',
        'gold': '#c4a35a',
        'deep-blue': '#2a4a5e',
        'forest': '#3d5c4a',
        'bard': {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#977669',
          800: '#846358',
          900: '#43302b',
        }
      },
      fontFamily: {
        'cormorant': ['Cormorant', 'serif'],
        'plex': ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
