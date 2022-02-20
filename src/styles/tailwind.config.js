module.exports = {
    content: ['./src/**/*.{html,js}'],
    theme: {
      colors: {
        'black': '#000000',
        'white': '#ffffff',
        'grey': {
            100: '#E0E0E0',
            300: '#A8A8A8',
            500: '#6F6F6F',
            700: '#393939',
            800: '#262626',
            900: '#171717',
        },
        'error': {
            300: '#FDA29B',
            500: '#F04438',
            800: '#912018',
            900: '#7A271A'
        },
        'success': {
            300: '#6CE9A6',
            500: '#12B76A',
            800: '#05603A',
            900: '#054F31'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      extend: {
        spacing: {
          '8xl': '96rem',
          '9xl': '128rem',
        },
        borderRadius: {
          '4xl': '2rem',
        }
      }
    },
  }
  