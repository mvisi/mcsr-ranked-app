/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ranked: {
          background: '#18181b',
          surface: '#27272a',
          inset: '#09090b',
          border: '#3f3f46',
          muted: '#a1a1aa',
          green: '#70a822',
          gold: '#facc15',
        },
      },
      fontFamily: {
        minecraft: ['Minecraft'],
        'minecraft-bold': ['MinecraftBold'],
      },
    },
  },
  plugins: [],
};
