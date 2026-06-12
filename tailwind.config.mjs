/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        signal: "#0f766e",
        clay: "#b45309",
        paper: "#fbfaf7",
        line: "#d9dee7"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 45px rgba(20, 33, 61, 0.12)"
      }
    }
  },
  plugins: []
};
