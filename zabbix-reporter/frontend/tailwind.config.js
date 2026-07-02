/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Ferrari-inspired telemetry palette.
        // Theme-varying tokens resolve to CSS variables (RGB triplets) so a
        // single class on <html> swaps the whole palette (dark ⇄ light) while
        // Tailwind alpha modifiers (e.g. bg-canvas/95) keep working.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)', // page floor
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)', // cards/panels
        'elevated-2': 'rgb(var(--c-elevated-2) / <alpha-value>)', // raised cells, inputs
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        body: 'rgb(var(--c-body) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        'muted-soft': 'rgb(var(--c-muted-soft) / <alpha-value>)',
        hairline: 'rgb(var(--c-hairline) / <alpha-value>)',
        'hairline-strong': 'rgb(var(--c-hairline-strong) / <alpha-value>)',
        rosso: {
          DEFAULT: '#da291c', // Rosso Corsa — the single brand voltage
          active: '#b01e0a',
          hover: '#9d2211',
        },
        'sig-info': '#4c98b9',
        'sig-success': '#03904a',
        'sig-warning': '#f13a2c',
        'sig-yellow': '#f6e500',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        cta: '0.1em', // ~1.4px @14px — CTA/eyebrow tracking
        nav: '0.05em',
        display: '-0.02em', // negative tracking on display
      },
      boxShadow: {
        soft: '0 4px 8px rgba(0,0,0,0.4)', // single shadow tier
      },
    },
  },
  plugins: [],
}
