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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        flowDown: {
          "0%":   { transform: "translateX(-50%) translateY(-4px)", opacity: "0" },
          "20%":  { opacity: "1" },
          "80%":  { opacity: "1" },
          "100%": { transform: "translateX(-50%) translateY(36px)", opacity: "0" },
        },
      },
      animation: {
        flowDown: "flowDown 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
