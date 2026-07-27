"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { FieldRow } from "@/components/affordance/Field";
import { TracePanel } from "@/components/trace/TracePanel";
import { Chip, AffordanceLegend, StageRail } from "@/components/ui";
import { useStore } from "@/components/store";
import {
  getClient,
  getDocuments,
  getFields,
  getReturn,
  SECTIONS,
} from "@/lib/data";
import { money, relativeDays, longDate } from "@/lib/format";
import { scoreReturn } from "@/lib/priority";
import type { SectionId } from "@/lib/types";
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconChevronRight,
  IconDoc,
  IconSparkle,
  IconClock,
  IconUndo,
} from "@/components/Icons";

export default function ReturnWorkspace() {
  const params = useParams<{ id: string }>();
  const ret = getReturn(params.id);
  if (!ret) notFound();

  const client = getClient(ret.clientId)!;
  const rawFields = getFields(ret.id);
  const docs = getDocuments(ret.id);
  const { resolve, activity, edit, revert } = useStore();

  const fields = useMemo(() => rawFields.map(resolve), [rawFields, resolve]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyUnresolved, setOnlyUnresolved] = useState(false);
  const [section, setSection] = useState<SectionId | "all">("all");
  const [legendOpen, setLegendOpen] = useState(false);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  const unresolved = fields.filter(
    (f) => f.state === "ai-unverified" || f.state === "needs-approval",
  );
  const verified = fields.filter((f) => f.state === "verified");
  const ranked = scoreReturn(ret, client);

  const visible = fields.filter((f) => {
    if (section !== "all" && f.section !== section) return false;
    if (onlyUnresolved && f.state !== "ai-unverified" && f.state !== "needs-approval")
      return false;
    return true;
  });

  const grouped = SECTIONS.map((s) => ({
    section: s,
    items: visible.filter((f) => f.section === s.id),
  })).filter((g) => g.items.length > 0);

  const returnActivity = activity.filter((a) => a.returnId === ret.id);

  /** Moves to the next thing needing a decision without leaving the panel. */
  const advance = (fromId: string) => {
    const queue = unresolved.filter((f) => f.id !== fromId);
    setSelectedId(queue[0]?.id ?? null);
  };

  /**
   * Closing the loop on a decision.
   *
   * Accepting a value is the moment the work actually moves — but the value
   * simply going quiet-green is an anticlimax, and if the accept was a slip
   * there's no obvious way back at the point of action. This watches the
   * activity log (so it fires no matter where the accept came from) and raises
   * a brief, calm confirmation with a one-click undo, then gets out of the way.
   */
  const lastAction = returnActivity[0];
  const [confirmed, setConfirmed] = useState<{
    seq: number;
    kind: string;
    label: string;
    fieldId: string;
    /** This action cleared the last pending value on the return — the moment
     *  actually earns a beat, not just a per-field acknowledgment. */
    completedReview: boolean;
  } | null>(null);
  const [toastPaused, setToastPaused] = useState(false);

  useEffect(() => {
    if (!lastAction) return;
    if (lastAction.kind !== "accepted" && lastAction.kind !== "corrected") return;
    setConfirmed({
      seq: lastAction.seq,
      kind: lastAction.kind,
      label: lastAction.label,
      fieldId: lastAction.fieldId,
      completedReview: unresolved.length === 0,
    });
    setToastPaused(false);
  }, [lastAction?.seq, lastAction?.kind]);

  // Paused on hover or keyboard focus so the toast can't disappear out from
  // under someone who is still reaching for Undo. The completion beat gets a
  // longer stage than a routine save — it's earned once per review, not
  // repeated on every field, so it's allowed to linger a moment longer.
  useEffect(() => {
    if (!confirmed || toastPaused) return;
    const seq = confirmed.seq;
    const t = setTimeout(
      () => setConfirmed((c) => (c?.seq === seq ? null : c)),
      confirmed.completedReview ? 6000 : 4200,
    );
    return () => clearTimeout(t);
  }, [confirmed, toastPaused]);

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Returns", href: "/returns" },
          { label: client.name, href: `/returns?client=${client.id}` },
          { label: `${ret.form} · ${ret.taxYear}` },
        ]}
        title={client.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span>
              {ret.form} · Tax year {ret.taxYear}
            </span>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1">
              <IconClock size={11} />
              Due {longDate(ret.dueDate)} ({relativeDays(ranked.daysToDue)})
            </span>
            <span className="text-ink-300">·</span>
            <span className="flex items-center gap-1">
              <IconDoc size={11} /> {docs.length} documents
            </span>
          </span>
        }
        actions={
          <>
            <button
              onClick={() => setLegendOpen((o) => !o)}
              className="btn-ghost"
              aria-expanded={legendOpen}
            >
              What do the colours mean?
            </button>
            <Link href={`/documents?return=${ret.id}`} className="btn-ghost">
              <IconDoc size={13} /> Source documents
            </Link>
          </>
        }
      >
        <div className="flex items-center justify-between gap-6">
          <StageRail stage={ret.stage} />
          <div className="flex shrink-0 items-center gap-2">
            {unresolved.length > 0 && (
              <Chip className="bg-ai-100 text-ai-700">
                <IconSparkle size={10} /> {unresolved.length} to review
              </Chip>
            )}
            <Chip className="bg-ok-100 text-ok-700">
              <IconCheck size={10} /> {verified.length} verified
            </Chip>
          </div>
        </div>

        {legendOpen && (
          <div className="mt-3 animate-fade-in rounded-lg border border-ink-200 bg-ink-50 p-3.5">
            <AffordanceLegend columns={3} />
          </div>
        )}
      </PageHeader>

      <div className="flex min-h-0 flex-1">
        {/* ---- Outline ------------------------------------------------ */}
        <nav className="w-52 shrink-0 overflow-y-auto scroll-slim border-r border-ink-200 bg-surface px-2 py-3">
          <button
            onClick={() => setSection("all")}
            className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs ${
              section === "all" ? "bg-act-50 font-medium text-act-700" : "text-ink-600 hover:bg-ink-50"
            }`}
          >
            All lines
            <span className="tabular text-2xs text-ink-400">{fields.length}</span>
          </button>

          {SECTIONS.map((s) => {
            const items = fields.filter((f) => f.section === s.id);
            if (items.length === 0) return null;
            const pending = items.filter(
              (f) => f.state === "ai-unverified" || f.state === "needs-approval",
            ).length;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                title={s.description}
                className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs ${
                  section === s.id
                    ? "bg-act-50 font-medium text-act-700"
                    : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                {s.name}
                {pending > 0 ? (
                  <span className="rounded-full bg-ai-100 px-1.5 text-2xs font-semibold text-ai-700">
                    {pending}
                  </span>
                ) : (
                  <span className="tabular text-2xs text-ink-400">{items.length}</span>
                )}
              </button>
            );
          })}

          <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-ink-100 px-2.5 pt-3 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={onlyUnresolved}
              onChange={(e) => setOnlyUnresolved(e.target.checked)}
              className="h-3.5 w-3.5 accent-act-600"
            />
            Only what needs me
          </label>

          {returnActivity.length > 0 && (
            <div className="mt-4 border-t border-ink-100 px-2.5 pt-3">
              <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-400">
                Your changes
              </div>
              <div className="space-y-1.5">
                {returnActivity.slice(0, 6).map((a) => (
                  <button
                    key={a.seq}
                    onClick={() => setSelectedId(a.fieldId)}
                    title={`${a.label} — ${a.kind}`}
                    className="block w-full text-left"
                  >
                    <div className="truncate text-2xs font-medium text-ink-700">{a.label}</div>
                    <div className="truncate text-2xs text-ink-400">{a.kind}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ---- Lines --------------------------------------------------- */}
        <div className="min-w-0 flex-1 overflow-y-auto scroll-slim bg-surface">
          {unresolved.length > 0 && (
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-200 bg-ai-50/95 px-4 py-2 backdrop-blur">
              <IconSparkle size={14} className="shrink-0 text-ai-600" />
              <span className="flex-1 text-xs text-ink-700">
                <span className="font-medium">{unresolved.length} extracted values</span> are
                waiting on a person. Nothing files until they are cleared.
              </span>
              <button
                onClick={() => setSelectedId(unresolved[0].id)}
                className="btn-ai shrink-0"
              >
                Start reviewing
                <IconChevronRight size={12} />
              </button>
            </div>
          )}

          {grouped.map((g) => (
            <section key={g.section.id}>
              <div className="flex items-baseline justify-between border-b border-ink-200 bg-ink-50 px-4 py-1.5">
                <h2 className="text-2xs font-semibold uppercase tracking-wide text-ink-600">
                  {g.section.name}
                </h2>
                <span className="text-2xs text-ink-400">{g.section.description}</span>
              </div>
              {g.items.map((f) => (
                <FieldRow
                  key={f.id}
                  field={f}
                  selected={selectedId === f.id}
                  onInspect={() => setSelectedId(f.id)}
                  // Plain editable lines commit straight through. Only fields
                  // with an AI claim route through the review panel.
                  onCommit={(v) => edit(f, v)}
                />
              ))}
            </section>
          ))}

          {visible.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="text-sm font-medium text-ink-700">Nothing left here</div>
              <p className="mt-1 text-xs text-ink-500">
                Every line in this view has been dealt with.
              </p>
            </div>
          )}
        </div>

        {/* ---- Inspector ------------------------------------------------ */}
        <aside className="w-[440px] shrink-0 border-l border-ink-200 bg-surface">
          {selected ? (
            <TracePanel
              field={selected}
              onClose={() => setSelectedId(null)}
              // Resolving this value — however it's resolved — moves straight to
              // the next one waiting, as long as one exists. Flagging is excluded
              // by TracePanel itself: a flagged value stays unresolved (now
              // waiting on the client), so it isn't something to advance past.
              onAdvance={
                (selected.state === "ai-unverified" || selected.state === "needs-approval") &&
                unresolved.length > 1
                  ? () => advance(selected.id)
                  : undefined
              }
            />
          ) : (
            <InspectorIdle
              unresolvedCount={unresolved.length}
              onStart={() => unresolved[0] && setSelectedId(unresolved[0].id)}
              refundOrDue={ret.refundOrDue}
            />
          )}
        </aside>
      </div>

      {/* Point-of-action confirmation. Calm, brief, and reversible. */}
      {confirmed && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-30 -translate-x-1/2 animate-slide-in">
          <div
            role="status"
            aria-live="polite"
            onMouseEnter={() => setToastPaused(true)}
            onMouseLeave={() => setToastPaused(false)}
            onFocus={() => setToastPaused(true)}
            onBlur={() => setToastPaused(false)}
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-ok-600/30 bg-surface py-1.5 pl-3 pr-1.5 shadow-pop"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-ok-700">
              <IconCheckCircle size={15} />
              {confirmed.completedReview ? (
                <>
                  All caught up
                  <span className="font-normal text-ink-500">·</span>
                  <span className="max-w-[20rem] font-normal text-ink-600">
                    Every extracted value on this return has been reviewed.
                  </span>
                </>
              ) : (
                <>
                  {confirmed.kind === "accepted" ? "Verified" : "Updated"}
                  <span className="font-normal text-ink-500">·</span>
                  <span className="max-w-[16rem] truncate font-normal text-ink-600">
                    {confirmed.label}
                  </span>
                </>
              )}
            </span>
            <button
              onClick={() => {
                const f = rawFields.find((x) => x.id === confirmed.fieldId);
                if (f) revert(f);
                setConfirmed(null);
              }}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-act-700 transition-colors hover:bg-act-50"
            >
              <IconUndo size={12} /> Undo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function InspectorIdle({
  unresolvedCount,
  onStart,
  refundOrDue,
}: {
  unresolvedCount: number;
  onStart: () => void;
  refundOrDue: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-200 px-4 py-3">
        <div className="text-2xs font-medium uppercase tracking-wide text-ink-400">
          {refundOrDue >= 0 ? "Estimated refund" : "Estimated balance due"}
        </div>
        <div
          className={`tabular mt-0.5 text-2xl font-semibold ${
            refundOrDue >= 0 ? "text-ok-700" : "text-stop-700"
          }`}
        >
          {money(Math.abs(refundOrDue))}
        </div>
        <p className="mt-1 text-2xs text-ink-500">
          Provisional until every extracted value is reviewed.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100">
          <IconSparkle size={19} className="text-ink-400" />
        </div>
        <div className="mt-3 text-sm font-medium text-ink-800">Pick any line</div>
        <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-ink-500">
          Every value on this return traces back to the document it came from — the
          page, the box, and anything done to it along the way.
        </p>
        {unresolvedCount > 0 && (
          <button onClick={onStart} className="btn-ai mt-4">
            <IconAlert size={12} />
            Review {unresolvedCount} pending values
          </button>
        )}
      </div>
    </div>
  );
}
