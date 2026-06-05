import type { Config } from "tailwindcss";

/**
 * Design tokens map 1:1 to CSS variables declared in `globals.css`.
 * This keeps a single source of truth for theming (light/dark via [data-theme])
 * and prevents hardcoded hex values across the codebase.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          0: "var(--surface-0)",
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        chat: "var(--chat-bg)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          border: "var(--accent-border)",
        },
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};

export default config;
