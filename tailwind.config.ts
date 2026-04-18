import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Outfit'", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "monospace"],
        sans:    ["'Outfit'", "sans-serif"],
      },
      colors: {
        brand: { DEFAULT:"#5C6AC4", dark:"#4A57A8", light:"#EEF0FB" },
        warm: {
          bg:      "#F7F4EF",
          sidebar: "#EDE9E2",
          surface: "#FFFFFF",
          raised:  "#F7F4EF",
        },
        status: {
          active:  "#2563EB",
          scaled:  "#16A34A",
          pivoted: "#7C3AED",
          done:    "#0891B2",
          killed:  "#DC2626",
        },
        signal: {
          strong:  "#16A34A",
          unclear: "#D97706",
          weak:    "#DC2626",
        },
      },
      fontSize: {
        "2xs": ["0.625rem",  { lineHeight:"1rem" }],
        xs:    ["0.6875rem", { lineHeight:"1rem" }],
        sm:    ["0.8125rem", { lineHeight:"1.25rem" }],
        base:  ["0.9375rem", { lineHeight:"1.5rem" }],
        lg:    ["1.0625rem", { lineHeight:"1.5rem" }],
        xl:    ["1.25rem",   { lineHeight:"1.75rem" }],
        "2xl": ["1.625rem",  { lineHeight:"1.2" }],
        "3xl": ["2rem",      { lineHeight:"1.1" }],
        "4xl": ["2.5rem",    { lineHeight:"1" }],
        "5xl": ["3.25rem",   { lineHeight:"1" }],
      },
      borderRadius: {
        DEFAULT:"8px", sm:"6px", lg:"12px", full:"9999px",
      },
    },
  },
  plugins: [],
};
export default config;
