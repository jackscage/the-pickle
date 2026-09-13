import type { Config } from "tailwindcss";

// The Pickle's palette, from PROJECT_SPEC.md section 17.
// Interface text uses Nunito; the text inside a pickle uses Caveat, never
// interface chrome -- that contrast is what makes a pickle read as a
// scribbled note rather than a text post.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pickle: {
          DEFAULT: "#3E5641",
          bright: "#5F8063",
          deep: "#2C3E2F",
        },
        brine: {
          DEFAULT: "#B4BD87",
          pale: "#D6DCB8",
        },
        paper: {
          DEFAULT: "#F2EDDF",
          raised: "#FBF8EE",
        },
        ember: "#C07C22",
        alarm: "#A3402C",
        midnight: "#1B2430",
        ink: {
          DEFAULT: "#22281F",
          soft: "#5D6657",
          faint: "#8A9181",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
