/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}", "./Chat/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        twitch: {
          purple: '#9147ff',
          dark: '#772ce8',
          bg: '#0e0e10',
        },
        card: {
          bg: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        'sans': ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};
