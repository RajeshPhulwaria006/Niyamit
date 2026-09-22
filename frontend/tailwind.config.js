/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: "#0b3c5d",
          navy: "#1d2731",
          gold: "#d9b310",
          saffron: "#e65100",
          green: "#1b5e20",
          red: "#b71c1c",
          surface: "#f8fafc",
          card: "#ffffff",
          border: "#e2e8f0"
        }
      }
    },
  },
  plugins: [],
};
