"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/components/store";
import { ROLES, STATS } from "@/lib/data";
import { queueCounts, rankAll } from "@/lib/priority";
import {
  IconDoc,
  IconGrid,
  IconLayers,
  IconSparkle,
  IconChevronDown,
} from "@/components/Icons";
import { ThemeToggle } from "./ThemeToggle";
import { useMemo, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IconGrid },
  { href: "/returns", label: "Returns", icon: IconLayers },
  { href: "/documents", label: "Documents", icon: IconDoc },
  { href: "/system", label: "Design system", icon: IconSparkle },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, setRole, roleInfo } = useStore();
  const [roleOpen, setRoleOpen] = useState(false);

  // The badge on "Returns" counts returns that need this user's review — a
  // number on a nav item reads as "how many of these need me", not a tally of
  // the individual AI values inside them.
  const returnsNeedingReview = useMemo(() => queueCounts(rankAll(role)).aiReview, [role]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ---- Rail --------------------------------------------------- */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-ink-200 bg-surface">
        <div className="flex items-center gap-2 px-4 py-4">
          {/* A fixed dark badge, not `ink-900` — that token is semantic ("primary
              text") and inverts to near-white in dark mode, which would leave
              this always-white "T" invisible against it. The wordmark itself
              stays theme-aware via `text-ink-900` below. */}
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
            T
          </div>
          <div>
            <div className="text-sm font-semibold leading-none text-ink-900">Tessera</div>
            <div className="mt-0.5 text-2xs text-ink-400">Gray &amp; Grove CPA</div>
          </div>
        </div>

        <nav className="flex-1 px-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-act-50 text-act-700"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }`}
              >
                <Icon size={15} className={active ? "text-act-600" : "text-ink-400"} />
                {item.label}
                {item.href === "/returns" && returnsNeedingReview > 0 && (
                  <span
                    className="ml-auto rounded-full bg-ai-100 px-1.5 py-0.5 text-2xs font-semibold text-ai-700"
                    title={`${returnsNeedingReview} returns have values awaiting your review`}
                  >
                    {returnsNeedingReview}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ---- Appearance ------------------------------------------ */}
        <div className="border-t border-ink-200 px-2 pt-2">
          <ThemeToggle />
        </div>

        {/* ---- Role switch ----------------------------------------- */}
        <div className="relative border-t border-ink-200 p-2">
          <button
            onClick={() => setRoleOpen((o) => !o)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-ink-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-2xs font-semibold text-white">
              {roleInfo.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink-900">
                {roleInfo.name}
              </span>
              <span className="block truncate text-2xs text-ink-500">{roleInfo.title}</span>
            </span>
            <IconChevronDown size={13} className="shrink-0 text-ink-400" />
          </button>

          {roleOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-1 animate-fade-in rounded-lg border border-ink-200 bg-surface p-1 shadow-pop">
              <div className="px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400">
                View the product as
              </div>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRole(r.id);
                    setRoleOpen(false);
                  }}
                  className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-ink-50 ${
                    r.id === role ? "bg-act-50" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-2xs font-semibold text-white">
                    {r.initials}
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-ink-900">{r.title}</span>
                    <span className="block text-2xs leading-snug text-ink-500">{r.scope}</span>
                  </span>
                </button>
              ))}
              <div className="border-t border-ink-100 px-2 py-1.5 text-2xs text-ink-400">
                {STATS.returns} returns · {STATS.documents} documents · {STATS.fields} fields
                in this dataset
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ---- Content ------------------------------------------------ */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
