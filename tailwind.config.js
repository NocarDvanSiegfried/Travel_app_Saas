/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Якутская цветовая палитра
        yakutia: {
          turquoise: '#1aaac2',
          'turquoise-light': '#7FFFD4',
          'turquoise-dark': '#0099aa',
          blue: '#87CEEB',
          'blue-light': '#B0E0E6',
          'blue-dark': '#4682B4',
          ice: '#E0F6FF',
          'ice-light': '#F0F8FF',
          graphite: '#223344',
          'graphite-light': '#708090',
          white: '#FFFFFF',
          'border-light': '#c7eef5',
          'bg-start': '#d9f3ff',
          'bg-mid': '#bde8f6',
          'bg-end': '#a0d7e8',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'yakutia': '12px',
        'yakutia-lg': '16px',
      },
      boxShadow: {
        'yakutia': '0 2px 8px rgba(26, 170, 194, 0.1)',
        'yakutia-lg': '0 4px 16px rgba(26, 170, 194, 0.15)',
        'yakutia-soft': '0 2px 12px rgba(26, 170, 194, 0.12)',
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0px) scale(1)" },
        },
        softPop: {
          "0%": { opacity: 0, transform: "scale(0.7)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
        softPop: "softPop 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
}

