import type { Config } from "tailwindcss";

// frontend/tailwind.config.ts
// Extends Tailwind's theme to reference CSS variables from tokens.css.
// Values are references, not hardcoded duplicates.

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-sunken": "var(--color-surface-sunken)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          mid: "var(--color-primary-mid)",
          subtle: "var(--color-primary-subtle)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          text: "var(--color-accent-text)",
          subtle: "var(--color-accent-subtle)",
        },
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
        },
        border: "var(--color-border)",
        divider: "var(--color-divider)",
        success: {
          DEFAULT: "var(--color-success)",
          subtle: "var(--color-success-subtle)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          subtle: "var(--color-warning-subtle)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          subtle: "var(--color-error-subtle)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          subtle: "var(--color-info-subtle)",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        sans: ["Public Sans", "Segoe UI", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Code", "SFMono-Regular", "Consolas", "monospace"],
      },
      fontSize: {
        display: ["38px", { lineHeight: "44px", fontWeight: "600", letterSpacing: "-0.01em" }],
        h1:      ["26px", { lineHeight: "34px", fontWeight: "600", letterSpacing: "-0.005em" }],
        h2:      ["20px", { lineHeight: "28px", fontWeight: "500" }],
        h3:      ["15px", { lineHeight: "22px", fontWeight: "600" }],
        body:    ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "body-medium": ["15px", { lineHeight: "24px", fontWeight: "500" }],
        label:   ["13px", { lineHeight: "18px", fontWeight: "600" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        mono:    ["13px", { lineHeight: "20px", fontWeight: "400" }],
      },
      spacing: {
        "0":  "0px",
        "1":  "4px",
        "2":  "8px",
        "3":  "12px",
        "4":  "16px",
        "5":  "20px",
        "6":  "24px",
        "8":  "32px",
        "10": "40px",
        "12": "48px",
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        none:     "var(--shadow-none)",
        raised:   "var(--shadow-raised)",
        elevated: "var(--shadow-elevated)",
        modal:    "var(--shadow-modal)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard:   "var(--easing-standard)",
        emphasized: "var(--easing-emphasized)",
      },
      height: {
        "control-sm": "var(--size-control-sm)",
        "control-md": "var(--size-control-md)",
        "control-lg": "var(--size-control-lg)",
        nav:          "var(--nav-height)",
        "table-row":  "var(--table-row-height)",
      },
      minHeight: {
        "control-sm": "var(--size-control-sm)",
        "control-md": "var(--size-control-md)",
        "control-lg": "var(--size-control-lg)",
      },
      minWidth: {
        card: "var(--card-min-width)",
      },
      maxWidth: {
        container: "1120px",
      },
      screens: {
        sm:  "640px",
        md:  "768px",
        lg:  "1024px",
        xl:  "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
