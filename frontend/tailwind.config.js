/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Skyscanner-inspired цветовая палитра - обновленная
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        background: {
          DEFAULT: 'var(--color-background)',
          subtle: 'var(--color-background-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
          heading: 'var(--color-text-heading)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
        },
        input: {
          bg: 'var(--color-input-bg)',
          border: 'var(--color-input-border)',
          'border-focus': 'var(--color-input-border-focus)',
          placeholder: 'var(--color-input-placeholder)',
        },
        card: {
          bg: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
        },
        header: {
          bg: 'var(--color-header-bg)',
          border: 'var(--color-header-border)',
          text: 'var(--color-header-text)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['var(--font-family-base)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        sm: ['14px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        base: ['15px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        lg: ['17px', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        xl: ['19px', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '2xl': ['22px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '3xl': ['26px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '4xl': ['32px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        '5xl': ['40px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
      },
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        base: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

