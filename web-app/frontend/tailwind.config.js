/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // JKAP Memorial League Design System
        'jkap': {
          // Primary: Deep Navy Blue (HSL: 220 100% 22%)
          navy: {
            50: '#e6eeff',
            100: '#b3ccff',
            200: '#809fff',
            300: '#4d73ff',
            400: '#2652e6',
            500: '#0a3d91', // Primary
            600: '#082f70',
            700: '#062350',
            800: '#041830',
            900: '#020c18',
            950: '#010610',
          },
          // Accent: Vibrant Red (HSL: 0 84% 60%)
          red: {
            50: '#fff0f0',
            100: '#ffd6d6',
            200: '#ffadad',
            300: '#ff8585',
            400: '#ff5c5c',
            500: '#e63946', // Primary accent
            600: '#cc2936',
            700: '#a31d2a',
            800: '#7a141f',
            900: '#520d15',
            950: '#29070a',
          },
          // Neutral grays for dark mode
          gray: {
            50: '#f8f9fa',
            100: '#e9ecef',
            200: '#dee2e6',
            300: '#ced4da',
            400: '#adb5bd',
            500: '#6c757d',
            600: '#495057',
            700: '#343a40',
            800: '#212529',
            900: '#16191c',
            950: '#0d0f11',
          },
        },
        // Semantic colors
        'primary': 'hsl(220 100% 22%)',
        'primary-foreground': 'hsl(0 0% 100%)',
        'accent': 'hsl(0 84% 60%)',
        'accent-foreground': 'hsl(0 0% 100%)',
        'background': 'hsl(220 30% 6%)',
        'foreground': 'hsl(0 0% 98%)',
        'card': 'hsl(220 30% 10%)',
        'card-foreground': 'hsl(0 0% 98%)',
        'muted': 'hsl(220 20% 18%)',
        'muted-foreground': 'hsl(220 10% 60%)',
        'border': 'hsl(220 20% 20%)',
        'destructive': 'hsl(0 84% 60%)',
        'success': 'hsl(142 76% 36%)',
        'warning': 'hsl(38 92% 50%)',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(230, 57, 70, 0.3)',
        'glow-navy': '0 0 20px rgba(10, 61, 145, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-diamond': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'field-pattern': 'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.02) 50px, rgba(255,255,255,0.02) 100px)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(230, 57, 70, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(230, 57, 70, 0.4)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
