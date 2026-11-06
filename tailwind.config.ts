import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "rhr-burgundy": {
          DEFAULT: "#7C0A02",
          light: "#9E1B12",
          dark: "#560601",
          50: "#FDF2F2",
          100: "#FBE5E4",
          200: "#F6CBC8",
          600: "#9E1B12",
          700: "#7C0A02",
          800: "#5A0701",
          900: "#3D0400",
        },
        "rhr-dark": {
          DEFAULT: "#111315",
          light: "#1C1F23",
          muted: "#2A2E33",
        },
        "rhr-gold": {
          DEFAULT: "#D4AF37",
          light: "#E5C65C",
          dark: "#AA8A24",
          50: "#FBF8EB",
        },
        "rhr-surface": {
          DEFAULT: "#F8F9FA",
          card: "#FFFFFF",
          muted: "#F1F3F5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        rhr: "0 10px 30px -10px rgba(124, 10, 2, 0.25)",
        "rhr-gold": "0 8px 24px -6px rgba(212, 175, 55, 0.25)",
        card: "0 2px 12px rgba(17, 19, 21, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;

