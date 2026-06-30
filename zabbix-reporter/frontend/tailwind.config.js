/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Ferrari-inspired telemetry palette
        canvas: '#181818', // near-black page floor (slightly warm, never pure black)
        elevated: '#222222', // cards/panels on canvas
        'elevated-2': '#303030', // raised cells, inputs
        ink: '#ffffff',
        body: '#969696',
        muted: '#666666',
        'muted-soft': '#8f8f8f',
        hairline: '#303030',
        'hairline-strong': '#3d3d3d',
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
