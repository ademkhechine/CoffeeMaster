/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        coffee: {
          50:  '#fdf6ec',
          100: '#f9e9cc',
          200: '#f3d09a',
          300: '#e9b562',
          400: '#de9a35',
          500: '#c9821c',
          600: '#b06614',
          700: '#8c4d13',
          800: '#6f4e37',
          900: '#3d2b1f',
          950: '#1a1209',
        },
        latte: '#C9A96E',
        espresso: '#3D1C02',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'coffee': '0 4px 24px 0 rgba(111,78,55,0.15)',
        'coffee-lg': '0 8px 40px 0 rgba(111,78,55,0.25)',
      },
      backgroundImage: {
        'coffee-gradient': 'linear-gradient(135deg, #6F4E37 0%, #C9A96E 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1a1209 0%, #3d2b1f 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
