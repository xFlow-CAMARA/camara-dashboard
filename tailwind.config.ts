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
        bg:            "var(--bg)",
        "bg-soft":     "var(--bg-soft)",
        "bg-deep":     "var(--bg-deep)",
        card:          "var(--card)",
        "card-soft":   "var(--card-soft)",
        "card-sunken": "var(--card-sunken)",
        "card-pale":   "var(--card-pale)",
        "card-blue":   "var(--card-blue)",
        "card-cream":  "var(--card-cream)",
        "card-mint":   "var(--card-mint)",
        ink:            "var(--ink)",
        "ink-2":       "var(--ink-2)",
        "ink-3":       "var(--ink-3)",
        "ink-on-dark": "var(--ink-on-dark)",
        hairline:      "var(--hairline)",
        moss:    { DEFAULT: "var(--moss)",    bg: "var(--moss-bg)" },
        amber:   { DEFAULT: "var(--amber)",   bg: "var(--amber-bg)" },
        rust:    { DEFAULT: "var(--rust)",    bg: "var(--rust-bg)" },
        slate:   { DEFAULT: "var(--slate)",   bg: "var(--slate-bg)" },
        accent:  { DEFAULT: "var(--accent)",  bg: "var(--accent-bg)" },
        "accent-coral":  { DEFAULT: "var(--accent-coral)",  bg: "var(--accent-coral-bg)" },
        "accent-violet": { DEFAULT: "var(--accent-violet)", bg: "var(--accent-violet-bg)" },
        // Legacy aliases so the older CAMARA-API test pages still compile.
        background: "var(--bg)",
        foreground: "var(--ink)",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "system-ui", "sans-serif"],
        body:    ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "SF Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg:      "var(--radius-lg)",
        pill:    "var(--radius-pill)",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
        sm:      "var(--shadow-sm)",
        lg:      "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
export default config;
