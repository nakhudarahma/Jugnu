/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, calm base — deliberately not a clinical dashboard palette.
        // Every colour is driven by a CSS variable (rgb triplet) so the same
        // utilities can flip between the light caregiver surface and the warm
        // night-glow caregiver surface via the `.caregiver-night` scope.
        cream: 'rgb(var(--cream) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        // Jugnu = firefly. The primary colour is its warm glow.
        glow: {
          50: 'rgb(var(--glow-50) / <alpha-value>)',
          100: 'rgb(var(--glow-100) / <alpha-value>)',
          200: 'rgb(var(--glow-200) / <alpha-value>)',
          300: 'rgb(var(--glow-300) / <alpha-value>)',
          400: 'rgb(var(--glow-400) / <alpha-value>)',
          500: 'rgb(var(--glow-500) / <alpha-value>)',
          600: 'rgb(var(--glow-600) / <alpha-value>)',
          700: 'rgb(var(--glow-700) / <alpha-value>)',
        },
        sage: {
          50: 'rgb(var(--sage-50) / <alpha-value>)',
          100: 'rgb(var(--sage-100) / <alpha-value>)',
          200: 'rgb(var(--sage-200) / <alpha-value>)',
          500: 'rgb(var(--sage-500) / <alpha-value>)',
          600: 'rgb(var(--sage-600) / <alpha-value>)',
          700: 'rgb(var(--sage-700) / <alpha-value>)',
          800: 'rgb(var(--sage-800) / <alpha-value>)',
        },
        dusk: {
          100: 'rgb(var(--dusk-100) / <alpha-value>)',
          500: 'rgb(var(--dusk-500) / <alpha-value>)',
          700: 'rgb(var(--dusk-700) / <alpha-value>)',
        },
        clay: {
          50: 'rgb(var(--clay-50) / <alpha-value>)',
          100: 'rgb(var(--clay-100) / <alpha-value>)',
          200: 'rgb(var(--clay-200) / <alpha-value>)',
          500: 'rgb(var(--clay-500) / <alpha-value>)',
          600: 'rgb(var(--clay-600) / <alpha-value>)',
          700: 'rgb(var(--clay-700) / <alpha-value>)',
          800: 'rgb(var(--clay-800) / <alpha-value>)',
        },
        amber: {
          50: 'rgb(var(--amber-50) / <alpha-value>)',
          100: 'rgb(var(--amber-100) / <alpha-value>)',
          200: 'rgb(var(--amber-200) / <alpha-value>)',
          500: 'rgb(var(--amber-500) / <alpha-value>)',
          600: 'rgb(var(--amber-600) / <alpha-value>)',
          700: 'rgb(var(--amber-700) / <alpha-value>)',
          800: 'rgb(var(--amber-800) / <alpha-value>)',
        },
        lilac: {
          100: 'rgb(var(--lilac-100) / <alpha-value>)',
          500: 'rgb(var(--lilac-500) / <alpha-value>)',
          700: 'rgb(var(--lilac-700) / <alpha-value>)',
        },
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Iowan Old Style', 'Palatino', 'Georgia', 'Cambria', 'serif'],
      },
      borderRadius: {
        card: '26px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(43, 38, 34, 0.04), 0 8px 24px -12px rgba(43, 38, 34, 0.12)',
        lift: '0 2px 4px rgba(43, 38, 34, 0.06), 0 18px 40px -18px rgba(43, 38, 34, 0.22)',
        glow: '0 10px 30px -10px rgba(23, 166, 152, 0.5)',
        'card-night': '0 1px 2px rgba(0, 0, 0, 0.3), 0 10px 30px -14px rgba(0, 0, 0, 0.55)',
        'lift-night': '0 2px 4px rgba(0, 0, 0, 0.35), 0 20px 44px -20px rgba(0, 0, 0, 0.65)',
        'glow-night': '0 10px 32px -8px rgba(246, 188, 92, 0.35)',
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