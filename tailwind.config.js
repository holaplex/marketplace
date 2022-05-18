module.exports = {
  content: ['./src/**/**/**/*.{ts,tsx,js,jsx}'],
  theme: {
    colors: {
      black: '#000000',
      white: '#ffffff',
      green: {
        500: 'var(--green-500)',
      },
      gray: {
        100: 'var(--gray-100)',
        300: 'var(--gray-300)',
        500: 'var(--gray-500)',
        700: 'var(--gray-700)',
        800: 'var(--gray-800)',
        900: 'var(--gray-900)',
      },
      error: {
        300: 'var(--error-300)',
        500: 'var(--error-500)',
        800: 'var(--error-800)',
        900: 'var(--error-900)',
      },
      success: {
        300: 'var(--success-300)',
        500: 'var(--success-500)',
        800: 'var(--success-800)',
        900: 'var(--success-900)',
      },
      transparent: 'transparent',
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    extend: {
      boxShadow: {
        card: '0px 12px 16px rgba(0, 0, 0, 0.3)',
      },
      spacing: {
        '8xl': '96rem',
        '9xl': '128rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  variants: {},
  plugins: [],
  darkMode: 'class',
}
