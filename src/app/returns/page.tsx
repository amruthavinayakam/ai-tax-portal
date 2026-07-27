"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Chip, StageRail, EmptyState } from "@/components/ui";
import { useStore } from "@/components/store";
import { rankAll } from "@/lib/priority";
import { STAGES } from "@/lib/data";
import { money, relativeDays, shortDate } from "@/lib/format";
import type { ReturnStage } from "@/lib/types";
import {
  IconSearch,
  IconSparkle,
  IconConflict,
  IconChevronDown,
} from "@/components/Icons";

type SortKey = "priority" | "due" | "client" | "stage";

/**
 * The full book of work.
 *
 * The dashboard answers "what now"; this answers "where is X". They are
 * deliberately different surfaces — collapsing them produces a dashboard that
 * is really a table, which is the failure mode the brief describes.
 */
export default function ReturnsPage() {
  const { role } = useStore();
  const [query, setQuery] = useState("");
  const [stages, setStages] = useState<Set<ReturnStage>>(new Set());
  const [sort, setSort] = useState<SortKey>("priority");
  const [limit, setLimit] = useState(40);

  const all = useMemo(() => rankAll(role), [role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = all.filter((r) => {
      if (stages.size > 0 && !stages.has(r.ret.stage)) return false;
      if (!q) return true;
      return (
        r.client.name.toLowerCase().includes(q) ||
        r.ret.id.toLowerCase().includes(q) ||
        r.ret.form.toLowerCase().includes(q) ||
        r.nextAction.toLowerCase().includes(q)
      );
    });

    out = [...out].sort((a, b) => {
      switch (sort) {
        case "due":
          return a.daysToDue - b.daysToDue;
        case "client":
          return a.client.name.localeCompare(b.client.name);
        case "stage":
          return STAGES.indexOf(a.ret.stage) - STAGES.indexOf(b.ret.stage);
        default:
          return b.score - a.score;
      }
    });
    return out;
  }, [all, query, stages, sort]);

  const toggleStage = (s: ReturnStage) => {
    const next = new Set(stages);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setStages(next);
    setLimit(40);
  };

  return (
    <>
      <PageHeader
        title="Returns"
        subtitle={`${filtered.length} of ${all.length} returns${
          role === "manager" ? " across the firm" : " assigned to you"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-ink-300 bg-surface px-2.5 py-1.5 focus-within:border-act-600">
            <IconSearch size={14} className="shrink-0 text-ink-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(40);
              }}
              placeholder="Search client, return ID, or next action…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-ink-400"
            />
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-md border border-ink-300 bg-surface py-1.5 pl-2.5 pr-7 text-xs text-ink-700 outline-none focus:border-act-600"
            >
              <option value="priority">Sort: Priority</option>
              <option value="due">Sort: Due date</option>
              <option value="client">Sort: Client name</option>
              <option value="stage">Sort: Stage</option>
            </select>
            <IconChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400"
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {STAGES.map((s) => {
            const on = stages.has(s);
            const n = all.filter((r) => r.ret.stage === s).length;
            return (
              <button
                key={s}
                onClick={() => toggleStage(s)}
                className={`chip border transition-colors ${
                  on
                    ? "border-act-600 bg-act-600 text-white"
                    : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300"
                }`}
              >
                {s}
                <span className={on ? "text-white/70" : "text-ink-400"}>{n}</span>
              </button>
            );
          })}
          {stages.size > 0 && (
            <button
              onClick={() => setStages(new Set())}
              className="chip text-ink-500 hover:text-act-600"
            >
              Clear
            </button>
          )}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto scroll-slim bg-ink-100 px-6 py-5">
        {filtered.length === 0 ? (
          <EmptyState
            title="No returns match"
            body="Try clearing a stage filter, or searching for a different client."
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left">
                  {["Client", "Stage", "Next action", "Due", "Refund / due", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, limit).map((r) => (
                  <tr
                    key={r.ret.id}
                    className="border-b border-ink-100 last:border-0 hover:bg-ink-50"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/returns/${r.ret.id}`}
                        className="text-sm font-medium text-ink-900 hover:text-act-700 hover:underline"
                      >
                        {r.client.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-2xs text-ink-400">
                        {r.ret.id} · {r.ret.form}
                        {r.client.tier !== "Standard" && (
                          <Chip className="bg-ink-100 text-ink-500">{r.client.tier}</Chip>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-ink-700">{r.ret.stage}</div>
                      <div className="mt-1">
                        <StageRail stage={r.ret.stage} compact />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-ink-700">{r.nextAction}</div>
                      <div className="mt-0.5 flex gap-1">
                        {r.ret.unresolvedAiCount > 0 && (
                          <Chip className="bg-ai-100 text-ai-700">
                            <IconSparkle size={9} /> {r.ret.unresolvedAiCount}
                          </Chip>
                        )}
                        {r.ret.openItems.some((i) => i.kind === "Conflict") && (
                          <Chip className="bg-stop-100 text-stop-700">
                            <IconConflict size={9} /> Conflict
                          </Chip>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div
                        className={`text-xs ${
                          r.daysToDue < 0
                            ? "font-medium text-stop-700"
                            : r.daysToDue <= 7
                              ? "text-warn-700"
                              : "text-ink-600"
                        }`}
                      >
                        {shortDate(r.ret.dueDate)}
                      </div>
                      <div className="text-2xs text-ink-400">{relativeDays(r.daysToDue)}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`tabular text-xs font-medium ${
                          r.ret.refundOrDue >= 0 ? "text-ok-700" : "text-stop-700"
                        }`}
                      >
                        {money(r.ret.refundOrDue)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/returns/${r.ret.id}`} className="btn-ghost">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {limit < filtered.length && (
              <button
                onClick={() => setLimit((l) => l + 40)}
                className="w-full border-t border-ink-200 bg-ink-50 py-2.5 text-xs font-medium text-act-700 hover:bg-ink-100"
              >
                Show 40 more ({filtered.length - limit} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
