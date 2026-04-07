/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: { bg: '#0f1117', surface: '#1a1d27', surface2: '#232633', border: '#2e3245' },
      },
    },
  },
  plugins: [],
};
