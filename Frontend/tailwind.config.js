/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, calm base — deliberately not a clinical dashboard palette.
        cream: '#FDF8F2',
        sand: '#F7EEE2',
        paper: '#FFFFFF',
        line: '#EADFCF',
        ink: {
          DEFAULT: '#2B2622',
          soft: '#6B615A',
          faint: '#9A8F86',
        },
        // Jugnu = firefly. The primary colour is its warm glow.
        glow: {
          50: '#FEF7EC',
          100: '#FCEBD5',
          200: '#F7D5A9',
          300: '#F0BB79',
          400: '#E9A44E',
          500: '#E1892E',
          600: '#C46F1B',
          700: '#9C5615',
        },
        sage: { 100: '#E4EFEA', 500: '#3F7F6E', 700: '#2E5F52' },
        dusk: { 100: '#E8EBEF', 500: '#7A8592', 700: '#5A6472' },
        clay: { 100: '#F9E7DC', 500: '#C4744A', 700: '#9C5733' },
        lilac: { 100: '#EDE8F5', 500: '#7C6BA8', 700: '#5D4E85' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Iowan Old Style', 'Palatino', 'Georgia', 'Cambria', 'serif'],
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(43, 38, 34, 0.04), 0 8px 24px -12px rgba(43, 38, 34, 0.12)',
        lift: '0 2px 4px rgba(43, 38, 34, 0.06), 0 18px 40px -18px rgba(43, 38, 34, 0.22)',
        glow: '0 10px 30px -10px rgba(225, 137, 46, 0.55)',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        'speak-bar': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'ring-grow': { from: { transform: 'scale(0.9)', opacity: '0.7' }, to: { transform: 'scale(1.35)', opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 600ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'rise-in': 'rise-in 700ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'soft-pulse': 'soft-pulse 2600ms ease-in-out infinite',
        'ring-grow': 'ring-grow 2600ms ease-out infinite',
      },
    },
  },
  plugins: [],
}
