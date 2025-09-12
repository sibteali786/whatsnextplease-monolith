import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx}', // Include utils directory
  ],
  safelist: [
    // CRITICAL: All task status colors - explicitly list every single one
    'bg-blue-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-red-700',
    'bg-gray-500',
    'bg-green-700',
    'bg-red-300',
    'bg-red-600',
    'bg-gray-400',

    // Text colors
    'text-white',
    'text-black',

    // Hover states
    'hover:bg-blue-600',
    'hover:bg-yellow-600',
    'hover:bg-green-600',
    'hover:bg-red-600',
    'hover:bg-purple-600',
    'hover:bg-orange-600',
    'hover:bg-cyan-600',
    'hover:bg-red-800',
    'hover:bg-gray-600',
    'hover:bg-green-800',
    'hover:bg-red-400',
    'hover:bg-red-700',
    'hover:bg-gray-500',

    // Custom CSS property colors with opacity variants
    'bg-info',
    'text-info-foreground',
    'hover:bg-info/90',
    'bg-warning',
    'text-warning-foreground',
    'hover:bg-warning/90',
    'bg-success',
    'text-success-foreground',
    'hover:bg-success/90',
    'hover:bg-success/80',
    'bg-destructive',
    'text-destructive-foreground',
    'hover:bg-destructive/90',
    'bg-primary',
    'text-primary-foreground',
    'hover:bg-primary/90',
    'bg-muted',
    'text-muted-foreground',
    'hover:bg-muted/90',
    'bg-destructive/70',
    'hover:bg-destructive/60',

    // Add these specific missing colors that were in your images
    'bg-cyan-500',
    'hover:bg-cyan-600',
    'text-cyan-500',
    'bg-purple-500',
    'hover:bg-purple-600',
    'text-purple-500',
    'bg-red-700',
    'hover:bg-red-800',
    'text-red-700',
    'bg-gray-400',
    'hover:bg-gray-500',
    'text-gray-400',

    // Pattern-based safelist for comprehensive coverage
    {
      pattern: /^bg-(red|green|blue|yellow|orange|purple|cyan|gray)-(300|400|500|600|700|800)$/,
      variants: ['hover', 'focus', 'active', 'dark'],
    },
    {
      pattern: /^text-(red|green|blue|yellow|orange|purple|cyan|gray)-(300|400|500|600|700|800)$/,
      variants: ['hover', 'focus', 'active', 'dark'],
    },
    {
      pattern:
        /^hover:bg-(red|green|blue|yellow|orange|purple|cyan|gray)-(300|400|500|600|700|800)$/,
    },
    {
      pattern: /^border-(red|green|blue|yellow|orange|purple|cyan|gray)-(300|400|500|600|700|800)$/,
      variants: ['hover', 'focus'],
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        backgroundPrimary: 'hsl(270, 71%, 99%)',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        ghost: {
          DEFAULT: 'hsl(var(--ghost))',
          foreground: 'hsl(var(--ghost-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        textPrimary: 'hsla(0, 0%, 50%, 1)',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },

  plugins: [require('tailwindcss-animate')],
};

export default config;
