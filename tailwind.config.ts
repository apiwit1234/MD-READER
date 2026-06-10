import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:           'rgb(var(--c-bg) / <alpha-value>)',
        surface:      'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2':  'rgb(var(--c-surface-2) / <alpha-value>)',
        fg:           'rgb(var(--c-fg) / <alpha-value>)',
        muted:        'rgb(var(--c-muted) / <alpha-value>)',
        border:       'rgb(var(--c-border) / <alpha-value>)',
        accent:       'rgb(var(--c-accent) / <alpha-value>)',
        'accent-2':   'rgb(var(--c-accent-2) / <alpha-value>)',
        'accent-fg':  'rgb(var(--c-accent-fg) / <alpha-value>)',
        'accent-soft':'rgb(var(--c-accent-soft) / <alpha-value>)',
        danger:       'rgb(var(--c-danger) / <alpha-value>)',
        warn:         'rgb(var(--c-warn) / <alpha-value>)',
        ok:           'rgb(var(--c-ok) / <alpha-value>)',
        folder: {
          blue: '#2563eb',
          green: '#16a34a',
          purple: '#a855f7',
          orange: '#ea580c',
          pink: '#db2777',
          teal: '#0d9488',
        },
      },
      borderRadius: {
        theme: 'var(--radius)',
        'theme-sm': 'var(--r-sm)',
        'theme-md': 'var(--r-md)',
        'theme-lg': 'var(--r-lg)',
      },
      boxShadow: {
        'elev-1': 'var(--shadow-1)',
        'elev-2': 'var(--shadow-2)',
        'elev-3': 'var(--shadow-3)',
      },
    },
  },
  plugins: [],
};

export default config;
