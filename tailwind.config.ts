import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-barlow)", "sans-serif"],
        mono: ["var(--font-barlow-condensed)", "monospace"],
      },
      colors: {
        lime: { DEFAULT: "#AADC00", dark: "#88B200" },
        cream: "#F0EDE4",
        ink: "#0D0D0B",
      },
    },
  },
  plugins: [],
};
export default config;
