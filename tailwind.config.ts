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
        bg:           "var(--bg)",
        "bg-elev":   "var(--bg-elev)",
        "bg-sunken": "var(--bg-sunken)",
        ink:           "var(--ink)",
        "ink-2":      "var(--ink-2)",
        "ink-3":      "var(--ink-3)",
        hairline:     "var(--hairline)",
        sage: {
          50:   "var(--sage-50)",
          100: "var(--sage-100)",
          300: "var(--sage-300)",
          500: "var(--sage-500)",
          700: "var(--sage-700)",
          900: "var(--sage-900)",
        },
        moss:   { DEFAULT: "var(--moss)",   bg: "var(--moss-bg)" },
        amber:  { DEFAULT: "var(--amber)",  bg: "var(--amber-bg)" },
        rust:    { DEFAULT: "var(--rust)",    bg: "var(--rust-bg)" },
        slate:   { DEFAULT: "var(--slate)",   bg: "var(--slate-bg)" },
        // Legacy aliases kept so the old internal CAMARA test pages don't break.
        background: "var(--bg)",
        foreground: "var(--ink)",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body:     ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:     ["JetBrains Mono", "ui-monospace", "SF Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
