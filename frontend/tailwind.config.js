/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#1e2925', forest: '#31564b', citrus: '#d66d4b', paper: '#f7f7f2', mist: '#e7efed' },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Fraunces', 'Georgia', 'serif'] },
      boxShadow: { soft: '0 18px 50px rgba(30, 41, 37, .08)' },
    },
  },
  plugins: [],
}