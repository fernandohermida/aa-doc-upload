/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AA Ireland Brand Colors
        'aa-yellow': '#FFCC00',
        'aa-black': '#000000',
        'aa-primary': '#FFCC00',
        'aa-secondary': '#1a1a1a',

        // Semantic colors that work with yellow/black theme
        'aa-success': '#10b981',
        'aa-warning': '#f59e0b',
        'aa-error': '#ef4444',
      },
    },
  },
  plugins: [],
}
