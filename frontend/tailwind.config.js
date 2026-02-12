/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0C15', // Main Background
          800: '#151621', // Card Background
          700: '#1E1F2E', // Lighter Card/Hover
          600: '#2A2B3D', // Borders
        },
        accent: {
          purple: '#6366f1',
          green: '#22c55e',
          red: '#ef4444',
          blue: '#3b82f6',
          orange: '#f59e0b',
          pink: '#ec4899',
          teal: '#14b8a6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: []
};