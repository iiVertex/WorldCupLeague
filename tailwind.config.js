/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // FIFA World Cup League palette (kept from original, expanded)
        navy: {
          950: '#050b1c',
          900: '#071028',
          850: '#0b1838',
          800: '#101d45',
          700: '#14224d',
          600: '#1b2c63',
        },
        sky: {
          accent: '#4fc3f7',
          accent2: '#29b6f6',
        },
        danger: '#ff5252',
        success: '#34d399',
        warn: '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'Arial', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(79, 195, 247, 0.25)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'pitch-grid':
          'radial-gradient(circle at 20% 0%, rgba(79,195,247,0.12), transparent 40%), radial-gradient(circle at 90% 10%, rgba(41,182,246,0.08), transparent 35%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
