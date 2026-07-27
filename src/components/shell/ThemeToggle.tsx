"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/Icons";

type Theme = "light" | "dark";

/**
 * Light / dark switch.
 *
 * The actual theme is a single `data-theme` attribute on <html>; an inline
 * script in the document head sets it before first paint (see layout.tsx) so
 * there is no flash of the wrong theme on load. This control only reads that
 * attribute and flips it, persisting the choice so it survives a reload.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync from whatever the pre-paint script already decided.
  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    setTheme(current);
  }, []);

  const apply = (next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage may be unavailable; the in-session choice still holds */
    }
    setTheme(next);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-ink-200 bg-ink-50 p-0.5">
      {(
        [
          { id: "light" as const, icon: IconSun, label: "Light" },
          { id: "dark" as const, icon: IconMoon, label: "Dark" },
        ]
      ).map(({ id, icon: Icon, label }) => {
        const on = theme === id;
        return (
          <button
            key={id}
            onClick={() => apply(id)}
            aria-pressed={on}
            title={`${label} mode`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-2xs font-medium transition-colors ${
              on
                ? "bg-surface text-ink-900 shadow-card"
                : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <Icon size={13} className={on ? "text-act-600" : ""} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
