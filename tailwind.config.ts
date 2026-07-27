import type { Config } from "tailwindcss";

/**
 * The palette is deliberately narrow and each hue owns exactly one meaning.
 * The single most important rule in this product's visual language:
 *
 *   blue  = you can interact with this
 *   violet = a machine produced this
 *
 * Those two never overlap, so "AI touched it" can never be misread as
 * "click me", and vice versa. Everything else hangs off that split.
 *
 * Every colour resolves through a CSS variable holding space-separated RGB
 * channels (see globals.css). That indirection is what makes the light/dark
 * theme a single attribute flip on <html> rather than a `dark:` variant on
 * every element — and the `<alpha-value>` form keeps opacity modifiers like
 * `bg-ai-50/95` working against the variables.
 */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The primary surface (cards, inputs, chrome). Flips with the theme.
        surface: c("--surface"),
        // Neutrals — the app chrome.
        ink: {
          900: c("--ink-900"),
          800: c("--ink-800"),
          700: c("--ink-700"),
          600: c("--ink-600"),
          500: c("--ink-500"),
          400: c("--ink-400"),
          300: c("--ink-300"),
          200: c("--ink-200"),
          100: c("--ink-100"),
          50: c("--ink-50"),
        },
        // Interactive. Links, buttons, focus, selection.
        act: {
          700: c("--act-700"),
          600: c("--act-600"),
          500: c("--act-500"),
          100: c("--act-100"),
          50: c("--act-50"),
        },
        // Machine-generated. Never used for anything clickable-by-virtue-of-color.
        ai: {
          700: c("--ai-700"),
          600: c("--ai-600"),
          500: c("--ai-500"),
          100: c("--ai-100"),
          50: c("--ai-50"),
        },
        // Human-verified / done.
        ok: {
          700: c("--ok-700"),
          600: c("--ok-600"),
          100: c("--ok-100"),
          50: c("--ok-50"),
        },
        // Needs a decision from a person.
        warn: {
          700: c("--warn-700"),
          600: c("--warn-600"),
          100: c("--warn-100"),
          50: c("--warn-50"),
        },
        // Blocking. Conflict, overdue, rejected.
        stop: {
          700: c("--stop-700"),
          600: c("--stop-600"),
          100: c("--stop-100"),
          50: c("--stop-50"),
        },
        // Document surfaces read as paper. Kept light in both themes — a scan
        // is a scan — so the facsimile re-anchors its own text colours locally.
        paper: c("--paper"),
        "paper-edge": c("--paper-edge"),
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(2,6,12,0.04), 0 1px 3px rgba(2,6,12,0.06)",
        pop: "0 4px 6px -1px rgba(2,6,12,0.10), 0 10px 24px -6px rgba(2,6,12,0.20)",
        sheet: "0 1px 3px rgba(2,6,12,0.12), 0 12px 32px -12px rgba(2,6,12,0.28)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(139,92,246,0.45)" },
          "70%": { boxShadow: "0 0 0 8px rgba(139,92,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(139,92,246,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "slide-in": "slide-in 180ms ease-out",
        "pulse-ring": "pulse-ring 1.2s ease-out 2",
      },
    },
  },
  plugins: [],
};

export default config;
