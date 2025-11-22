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
        // Theme System v2 - Основные цвета
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
        },
        // Поверхности
        background: {
          DEFAULT: 'var(--color-background)',
          subtle: 'var(--color-background-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
          hover: 'var(--color-surface-hover)',
        },
        'dark-zone': {
          DEFAULT: 'var(--color-dark-zone)',
          alt: 'var(--color-dark-zone-alt)',
          border: 'var(--color-dark-zone-border)',
          text: 'var(--color-dark-zone-text)',
          'text-secondary': 'var(--color-dark-zone-text-secondary)',
          'text-tertiary': 'var(--color-dark-zone-text-tertiary)',
          hover: 'var(--color-dark-zone-hover)',
        },
        // Текст
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
          heading: 'var(--color-text-heading)',
        },
        // Границы
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          medium: 'var(--color-border-medium)',
          dark: 'var(--color-border-dark)',
          hover: 'var(--color-border-hover)',
        },
        divider: 'var(--color-divider)',
        // Инпуты
        input: {
          bg: 'var(--color-input-bg)',
          border: 'var(--color-input-border)',
          'border-focus': 'var(--color-input-border-focus)',
          placeholder: 'var(--color-input-placeholder)',
          text: 'var(--color-input-text)',
          'bg-dark': 'var(--color-input-bg-dark)',
          'border-dark': 'var(--color-input-border-dark)',
          'border-focus-dark': 'var(--color-input-border-focus-dark)',
          'placeholder-dark': 'var(--color-input-placeholder-dark)',
          'text-dark': 'var(--color-input-text-dark)',
        },
        // Карточки
        card: {
          bg: 'var(--color-card-bg)',
          border: 'var(--color-card-border)',
        },
        // Header/Footer
        header: {
          bg: 'var(--color-header-bg)',
          border: 'var(--color-header-border)',
          text: 'var(--color-header-text)',
          'text-secondary': 'var(--color-header-text-secondary)',
          'text-tertiary': 'var(--color-header-text-tertiary)',
          hover: 'var(--color-header-hover)',
        },
        // Состояния
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          light: 'var(--color-danger-light)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          light: 'var(--color-info-light)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family-base)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['var(--font-xs)', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.01em' }],
        sm: ['var(--font-sm)', { lineHeight: 'var(--leading-normal)', letterSpacing: '-0.01em' }],
        base: ['var(--font-md)', { lineHeight: 'var(--leading-normal)', letterSpacing: '-0.01em' }],
        lg: ['var(--font-lg)', { lineHeight: 'var(--leading-normal)', letterSpacing: '-0.02em' }],
        xl: ['var(--font-xl)', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.02em' }],
        '2xl': ['22px', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.02em' }],
        '3xl': ['26px', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.02em' }],
        '4xl': ['32px', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.03em' }],
        '5xl': ['40px', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.03em' }],
      },
      fontWeight: {
        light: 'var(--font-weight-light)',
        regular: 'var(--font-regular)',
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      lineHeight: {
        tight: 'var(--leading-tight)',
        normal: 'var(--leading-normal)',
        relaxed: 'var(--leading-relaxed)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
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
        fast: 'var(--motion-duration-xs)',
        base: 'var(--motion-duration-sm)',
        slow: 'var(--motion-duration-md)',
      },
      transitionTimingFunction: {
        default: 'var(--motion-ease-default)',
        emphasized: 'var(--motion-ease-emphasized)',
        decelerate: 'var(--motion-ease-decelerate)',
        accelerate: 'var(--motion-ease-accelerate)',
      },
      minWidth: {
        xs: '200px',
      },
      height: {
        input: 'var(--height-input)',
        header: 'var(--height-header)',
      },
      width: {
        logo: 'var(--size-logo)',
        'icon-md': 'var(--size-icon-md)',
      },
    },
  },
  plugins: [],
}

