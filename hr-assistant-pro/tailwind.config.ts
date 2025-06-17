import type { Config } from "tailwindcss";
import type { PluginAPI } from 'tailwindcss/types/config';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'rush-green': {
          light: '#E6F5F1',
          DEFAULT: '#009E74',
          dark: '#007A5C',
        },
        'rush-blue': {
          light: '#E6F1F5',
          DEFAULT: '#00729A',
          dark: '#005A7B',
        },
        'neutral-gray': {
          lightest: '#F8F9FA',
          light: '#E9ECEF',
          DEFAULT: '#CED4DA',
          dark: '#6C757D',
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        fadeInUp: 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }: PluginAPI) {
      addUtilities({
        '.animate-fadeInUp': {
          animationName: 'fadeInUp',
          animationDuration: '0.5s',
          animationTimingFunction: 'ease-out',
          animationFillMode: 'forwards',
          opacity: '0', /* Start hidden */
        }
      })
    }
  ],
};
export default config;
