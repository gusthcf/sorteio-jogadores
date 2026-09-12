/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Base neutra e profunda — o "papel" do app.
        ink: {
          950: '#08090A',
          900: '#0C0E10',
          850: '#111417',
          800: '#171B1F',
          750: '#1D2227',
          700: '#242A30',
          600: '#333B43',
          500: '#4A545E',
        },
        // Cor vibrante reservada exclusivamente para acoes primarias.
        volt: {
          400: '#DCFF6B',
          500: '#CCFF33',
          600: '#B2E619',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.28), 0 8px 24px -12px rgba(0,0,0,.6)',
        lift: '0 2px 4px rgba(0,0,0,.3), 0 18px 40px -18px rgba(0,0,0,.75)',
        glow: '0 8px 30px -10px rgba(204,255,51,.45)',
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up .32s cubic-bezier(.22,1,.36,1)',
        'fade-in': 'fade-in .22s ease-out',
        'pop-in': 'pop-in .34s cubic-bezier(.22,1,.36,1) backwards',
        'toast-in': 'toast-in .25s cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [],
}
