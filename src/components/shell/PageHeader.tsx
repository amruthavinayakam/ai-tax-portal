"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/Icons";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Page header with breadcrumbs.
 *
 * Breadcrumbs here are the object path, not the URL path — "Returns / Mira
 * Nakashima 2025 / Line 1a" rather than "/returns/R0031". Someone deep in a
 * review needs to know which client's return they are in, which is a question
 * the route alone does not answer.
 */
export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
  children,
}: {
  crumbs?: Crumb[];
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="shrink-0 border-b border-ink-200 bg-surface px-6 pb-3 pt-4">
      {crumbs && crumbs.length > 0 && (
        <nav className="mb-1.5 flex items-center gap-1 text-2xs text-ink-500">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.href ? (
                <Link href={c.href} className="hover:text-act-600 hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-400">{c.label}</span>
              )}
              {i < crumbs.length - 1 && <IconChevronRight size={11} className="text-ink-300" />}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight text-ink-900">{title}</h1>
          {subtitle && <div className="mt-0.5 text-xs text-ink-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}
