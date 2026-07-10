/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary accent – Signal Blue (the racing line; see BRAND.md)
        brand: {
          50:  '#eaf1ff',
          100: '#d6e3ff',
          200: '#adc7ff',
          300: '#7aa7ff',
          400: '#4f8cff',
          500: '#3b78f0',
          600: '#2f62d6',
          700: '#274fae',
          800: '#203f89',
        },
        // Warm dusk surfaces (Midnight Tarmac family)
        surface: {
          DEFAULT: '#14121a',
          50:  '#181521',
          100: '#1d1a26',
          150: '#221e2c',
          200: '#262231',
          300: '#322c40',
        },
        // Verdant — gains, confident not neon
        bull: {
          DEFAULT: '#18c98a',
          muted:   '#18c98a20',
          dim:     '#18c98a10',
        },
        // Coral — losses, serious never alarmist
        bear: {
          DEFAULT: '#ff5a72',
          muted:   '#ff5a7220',
          dim:     '#ff5a7210',
        },
        success: '#18c98a',
        danger:  '#ff5a72',
        warning: '#f6b24a',
        info:    '#7aa7ff',
        // Warm text shades (match --t-text-* tokens)
        text: {
          primary:   '#eeeaf4',
          secondary: '#a59fb2',
          muted:     '#6e6880',
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
        'glow-brand':   '0 0 20px rgba(79, 140, 255, 0.20)',
        'glow-bull':    '0 0 16px rgba(24, 201, 138, 0.25)',
        'glow-bear':    '0 0 16px rgba(255, 90, 114, 0.25)',
        'card':         '0 1px 2px rgba(12,8,16,0.45), 0 2px 6px rgba(12,8,16,0.28), 0 0 0 1px rgba(176,168,190,0.05)',
        'card-hover':   '0 4px 16px rgba(12,8,16,0.5), 0 0 0 1px rgba(79,140,255,0.2)',
        'panel':        '0 0 0 1px rgba(176,168,190,0.06)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #4f8cff 0%, #2f62d6 100%)',
        'bull-gradient':   'linear-gradient(135deg, #18c98a 0%, #109a68 100%)',
        'bear-gradient':   'linear-gradient(135deg, #ff5a72 0%, #d63a54 100%)',
        'surface-gradient':'linear-gradient(180deg, #221e2c 0%, #14121a 100%)',
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
          '0%':   { backgroundColor: 'rgba(79,140,255,0.18)' },
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
