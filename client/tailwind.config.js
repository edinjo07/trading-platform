/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary accent – sky / electric blue (IC Markets / Bloomberg style)
        brand: {
          50:  '#e0f2fe',
          100: '#bae6fd',
          200: '#7dd3fc',
          300: '#38bdf8',
          400: '#0ea5e9',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
        },
        // Deep-navy dark surfaces
        surface: {
          DEFAULT: '#06090f',
          50:  '#0c1220',
          100: '#10192b',
          150: '#141f32',
          200: '#1a2840',
          300: '#213356',
        },
        // Buy green (crisp)
        bull: {
          DEFAULT: '#00c878',
          muted:   '#00c87820',
          dim:     '#00c87810',
        },
        // Sell red (vibrant)
        bear: {
          DEFAULT: '#ff3047',
          muted:   '#ff304720',
          dim:     '#ff304710',
        },
        success: '#00c878',
        danger:  '#ff3047',
        warning: '#f59e0b',
        info:    '#38bdf8',
        // Text shades
        text: {
          primary:   '#d4dde8',
          secondary: '#6b8099',
          muted:     '#3b5070',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
      boxShadow: {
        'glow-brand':   '0 0 20px rgba(14, 165, 233, 0.20)',
        'glow-bull':    '0 0 16px rgba(0, 200, 120, 0.25)',
        'glow-bear':    '0 0 16px rgba(255, 48, 71, 0.25)',
        'card':         '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover':   '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,233,0.2)',
        'panel':        '0 0 0 1px rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #0ea5e9 0%, #075985 100%)',
        'bull-gradient':   'linear-gradient(135deg, #00c878 0%, #009a5c 100%)',
        'bear-gradient':   'linear-gradient(135deg, #ff3047 0%, #c2001e 100%)',
        'surface-gradient':'linear-gradient(180deg, #0c1220 0%, #06090f 100%)',
        'card-shimmer':    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
      },
      keyframes: {
        slideIn: {
          '0%':   { transform: 'translateX(110%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        tickFlash: {
          '0%':   { backgroundColor: 'rgba(14,165,233,0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        slideIn:   'slideIn 0.28s cubic-bezier(0.16,1,0.3,1)',
        fadeUp:    'fadeUp  0.22s ease-out',
        fadeIn:    'fadeIn  0.18s ease-out',
        pulse2:    'pulse2  2s ease-in-out infinite',
        tickFlash: 'tickFlash 0.6s ease-out',
        shimmer:   'shimmer 1.8s linear infinite',
        marquee:   'marquee 40s linear infinite',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
