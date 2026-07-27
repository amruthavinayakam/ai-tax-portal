"use client";

import type { ReactNode } from "react";
import { bandFor, FIELD_STATES, STATE_ORDER } from "./affordance/states";
import { STAGES } from "@/lib/data";
import { stageProgress } from "@/lib/priority";
import type { ReturnStage } from "@/lib/types";
import { IconCheck, IconChevronRight } from "./Icons";

export function Chip({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={`chip ${className}`} title={title}>
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  hint,
  right,
}: {
  children: ReactNode;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-ink-900">{children}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * Confidence, shown as a band with a recommended behaviour attached.
 *
 * The percentage is present but subordinate — it is the band that tells a
 * reviewer what to *do*, and that is what gets the visual weight.
 */
export function ConfidenceMeter({
  confidence,
  compact,
}: {
  confidence: number;
  compact?: boolean;
}) {
  const band = bandFor(confidence);
  const pct = Math.round(confidence * 100);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5" title={`Model confidence ${pct}%`}>
        <span className={`h-1.5 w-1.5 rounded-full ${band.bar}`} />
        <span className={`text-2xs font-medium ${band.text}`}>{band.label}</span>
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className={`text-xs font-semibold ${band.text}`}>{band.label}</span>
        <span className="tabular text-2xs text-ink-400">{pct}% confidence</span>
      </div>
      <div className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${band.track}`}>
        <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-2xs text-ink-500">{band.guidance}</p>
    </div>
  );
}

/** The affordance key. Available from anywhere, because a legend nobody can find is decoration. */
export function AffordanceLegend({ columns = 2 }: { columns?: number }) {
  return (
    <div
      className="grid gap-x-6 gap-y-2.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {STATE_ORDER.map((id) => {
        const meta = FIELD_STATES[id];
        const Icon = meta.icon;
        return (
          <div key={id} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${meta.chip}`}
            >
              <Icon size={11} />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium text-ink-800">{meta.name}</div>
              <div className="text-2xs leading-relaxed text-ink-500">{meta.rule}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Stage rail.
 *
 * Statuses are drawn as a fixed pipeline rather than a free-text label so that
 * "where is this" has one answer with one shape. The stage names are the same
 * words in every view — what changes by audience is how much of the rail is
 * shown, not what the stages are called.
 */
export function StageRail({
  stage,
  compact,
}: {
  stage: ReturnStage;
  compact?: boolean;
}) {
  const currentIndex = STAGES.indexOf(stage);

  if (compact) {
    return (
      <div className="flex items-center gap-1" title={`${stage} — ${stageProgress(stage)}% through the pipeline`}>
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={`h-1 rounded-full transition-colors ${
              i < currentIndex ? "w-3 bg-ok-600" : i === currentIndex ? "w-6 bg-act-600" : "w-3 bg-ink-200"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {STAGES.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={s} className="flex items-center">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium ${
                done
                  ? "bg-ok-50 text-ok-700"
                  : active
                    ? "bg-act-600 text-white"
                    : "bg-ink-100 text-ink-400"
              }`}
            >
              {done && <IconCheck size={10} />}
              {s}
            </span>
            {i < STAGES.length - 1 && (
              <IconChevronRight size={12} className="mx-0.5 text-ink-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Stat({
  label,
  value,
  tone = "ink",
  hint,
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  tone?: "ink" | "stop" | "warn" | "ok" | "ai";
  hint?: string;
  /** When present, the whole stat becomes a button — e.g. apply its filter. */
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClass = {
    ink: "text-ink-900",
    stop: "text-stop-700",
    warn: "text-warn-700",
    ok: "text-ok-700",
    ai: "text-ai-700",
  }[tone];

  const body = (
    <>
      <div className="flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-ink-400">
        {label}
        {onClick && (
          <IconChevronRight
            size={11}
            className="text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>
      <div className={`mt-1 tabular text-xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-2xs text-ink-500">{hint}</div>}
    </>
  );

  if (!onClick) {
    return <div className="card px-3.5 py-3">{body}</div>;
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`card group px-3.5 py-3 text-left transition-colors hover:border-ink-300 hover:bg-ink-50 ${
        active ? "ring-2 ring-act-500 ring-offset-1 ring-offset-surface" : ""
      }`}
    >
      {body}
    </button>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-300 bg-surface/60 px-6 py-12 text-center">
      <div className="text-sm font-medium text-ink-700">{title}</div>
      <div className="mt-1 max-w-sm text-xs text-ink-500">{body}</div>
    </div>
  );
}
