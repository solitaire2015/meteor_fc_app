/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors from CLAUDE.md
        'brand-blue': '#7B8EE3',
        'light-purple': '#B8AFFF',
        
        // Text Colors
        'primary-text-dark': '#2C2C3E',
        'secondary-text-dark': '#8A8A9E',
        'header-text-light': '#FFFFFF',
        'subheader-text-light': 'rgba(255, 255, 255, 0.75)',
        
        // Glassmorphism Colors
        'glass-bg': 'rgba(255, 255, 255, 0.25)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
        
        // Status Colors
        'success-color': '#4CAF50',
        'warning-color': '#FF9800',
        'gold': '#FFC107',
        'silver': '#D0D3D8',
        'bronze': '#CD7F32',
        
        // Position Colors (eFootball Style)
        'goalkeeper-color': {
          text: '#CA8A04', // text-yellow-600
          bg: '#FEF3C7', // bg-yellow-50
        },
        'defender-color': {
          text: '#2563EB', // text-blue-600
          bg: '#EFF6FF', // bg-blue-50
        },
        'midfielder-color': {
          text: '#16A34A', // text-green-600
          bg: '#F0FDF4', // bg-green-50
        },
        'forward-color': {
          text: '#DC2626', // text-red-600
          bg: '#FEF2F2', // bg-red-50
        },
      },
      fontFamily: {
        // Typography System from CLAUDE.md
        'mulish': ['var(--font-mulish)', 'system-ui', 'sans-serif'],
        'geist': ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        'geist-mono': ['var(--font-geist-mono)', 'monospace'],
      },
      backgroundImage: {
        // Brand Gradient
        'brand-gradient': 'linear-gradient(to bottom right, var(--tw-colors-brand-blue), var(--tw-colors-light-purple))',
      },
      backdropBlur: {
        'glass': '10px',
      },
      borderRadius: {
        'glass': '15px',
        'modern': '8px',
      },
      spacing: {
        // Layout spacing from CLAUDE.md
        'mobile-padding': '25px',
        'tablet-padding': '30px',
        'desktop-padding': '40px',
      },
      screens: {
        // Breakpoints from CLAUDE.md
        'tablet': '768px',
        'desktop': '1024px',
      },
      animation: {
        // Standard animations from CLAUDE.md
        'hover-lift': 'hover-lift 0.2s ease',
        'hover-scale': 'hover-scale 0.2s ease',
      },
      keyframes: {
        'hover-lift': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
        'hover-scale': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.02)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 25px rgba(0, 0, 0, 0.15)',
        'hover': '0 10px 30px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
  // Ensure compatibility with existing shadcn/ui setup
  darkMode: 'class',
}