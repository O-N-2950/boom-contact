/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        boom: '#FF3500',
        'boom-2': '#FFB300',
      }
    },
  },
  plugins: [],
};
