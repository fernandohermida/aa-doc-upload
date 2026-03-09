/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aa-primary': '#003366',
        'aa-success': '#10b981',
        'aa-warning': '#f59e0b',
        'aa-error': '#ef4444',
      },
    },
  },
  plugins: [],
}
