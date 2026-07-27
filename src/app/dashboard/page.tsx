"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { PageHeader } from "@/components/shell/PageHeader";
import { Chip, SectionTitle, Stat, StageRail, EmptyState } from "@/components/ui";
import {
  bottlenecks,
  queueCounts,
  rankAll,
  totalAiPending,
  workloads,
} from "@/lib/priority";
import { getRole, STATS } from "@/lib/data";
import { longDate, money, relativeDays, TODAY, isoDate } from "@/lib/format";
import type { RankedReturn } from "@/lib/types";
import {
  IconAlert,
  IconArrowRight,
  IconChevronDown,
  IconClock,
  IconConflict,
  IconSparkle,
  IconUser,
} from "@/components/Icons";

type QueueFilter = "focus" | "overdue" | "conflicts" | "waitingClient" | "aiReview";

const FILTERS: { id: QueueFilter; label: string }[] = [
  { id: "focus", label: "Top priority" },
  { id: "overdue", label: "Overdue" },
  { id: "conflicts", label: "Conflicts" },
  { id: "aiReview", label: "AI to review" },
  { id: "waitingClient", label: "Waiting on client" },
];

export default function DashboardPage() {
  const { role, roleInfo } = useStore();
  const [filter, setFilter] = useState<QueueFilter>("focus");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limit, setLimit] = useState(12);

  // Greet by the viewer's real local time. Resolved after mount so the server
  // and client markup match (the clock only exists in the browser).
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const ranked = useMemo(() => rankAll(role), [role]);
  const counts = useMemo(() => queueCounts(ranked), [ranked]);
  const isManager = role === "manager";

  const filtered = useMemo(() => {
    const live = ranked.filter((r) => r.ret.stage !== "Filed");
    switch (filter) {
      case "overdue":
        return live.filter((r) => r.daysToDue < 0);
      case "conflicts":
        return live.filter((r) => r.ret.openItems.some((i) => i.kind === "Conflict"));
      case "waitingClient":
        return live.filter((r) => r.ret.openItems.some((i) => i.owner === "Client"));
      case "aiReview":
        return live.filter((r) => r.ret.unresolvedAiCount > 0);
      default:
        return live;
    }
  }, [ranked, filter]);

  const visible = filtered.slice(0, limit);

  const selectFilter = (f: QueueFilter) => {
    setFilter(f);
    setLimit(12);
  };

  return (
    <>
      <PageHeader
        title={`${greeting}, ${roleInfo.name.split(" ")[0]}`}
        subtitle={
          <span>
            {longDate(isoDate(TODAY))} · {isManager
              ? `Whole book — ${counts.all} open returns`
              : `${counts.all} returns assigned to you`}
          </span>
        }
        actions={
          <Link href="/returns" className="btn-ghost">
            All returns
            <IconArrowRight size={13} />
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto scroll-slim bg-ink-100 px-6 py-5">
        {/* ---- The four numbers worth interrupting someone for --------
             Each is a live filter: click the number, the queue below scopes to
             it. The big red count and the way to act on it are the same target. */}
        <div className="mb-5 grid grid-cols-4 gap-3">
          <Stat
            label="Past due"
            value={counts.overdue}
            tone={counts.overdue > 0 ? "stop" : "ok"}
            hint={counts.overdue > 0 ? "Deadline already missed" : "Nothing overdue"}
            onClick={counts.overdue > 0 ? () => selectFilter("overdue") : undefined}
            active={filter === "overdue"}
          />
          <Stat
            label="Blocked by conflicts"
            value={counts.conflicts}
            tone={counts.conflicts > 0 ? "stop" : "ok"}
            hint="Sources disagree — needs a person"
            onClick={counts.conflicts > 0 ? () => selectFilter("conflicts") : undefined}
            active={filter === "conflicts"}
          />
          <Stat
            label="AI values to review"
            value={totalAiPending(ranked)}
            tone="ai"
            hint={`Across ${counts.aiReview} returns`}
            onClick={counts.aiReview > 0 ? () => selectFilter("aiReview") : undefined}
            active={filter === "aiReview"}
          />
          <Stat
            label="Waiting on client"
            value={counts.waitingClient}
            tone={counts.waitingClient > 0 ? "warn" : "ok"}
            hint="Your move is a nudge, not work"
            onClick={counts.waitingClient > 0 ? () => selectFilter("waitingClient") : undefined}
            active={filter === "waitingClient"}
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* ---- Priority queue ------------------------------------- */}
          <div className="col-span-2">
            <SectionTitle
              hint={
                isManager
                  ? "Ranked across the whole firm. The reasons are shown so you can disagree with the ranking on specific grounds."
                  : "Ranked by the same rules for every return. Open a row to see exactly why it is where it is."
              }
              right={
                <span className="text-2xs text-ink-400">
                  Showing {visible.length} of {filtered.length}
                </span>
              }
            >
              What to work on next
            </SectionTitle>

            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => {
                const n =
                  f.id === "focus"
                    ? counts.all
                    : f.id === "overdue"
                      ? counts.overdue
                      : f.id === "conflicts"
                        ? counts.conflicts
                        : f.id === "aiReview"
                          ? counts.aiReview
                          : counts.waitingClient;
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => selectFilter(f.id)}
                    aria-pressed={active}
                    className={`chip border transition-colors ${
                      active
                        ? "border-act-600 bg-act-600 text-white"
                        : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300"
                    }`}
                  >
                    {f.label}
                    <span className={active ? "text-white/70" : "text-ink-400"}>{n}</span>
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                title="Nothing here"
                body="No returns match this filter right now. Try another filter, or open the full returns list."
              />
            ) : (
              <div className="card divide-y divide-ink-100 overflow-hidden">
                {visible.map((r, i) => (
                  <QueueRow
                    key={r.ret.id}
                    rank={i + 1}
                    item={r}
                    open={expanded === r.ret.id}
                    onToggle={() => setExpanded(expanded === r.ret.id ? null : r.ret.id)}
                  />
                ))}
              </div>
            )}

            {visible.length < filtered.length && (
              <button
                onClick={() => setLimit((l) => l + 20)}
                className="btn-ghost mt-3 w-full"
              >
                Show 20 more
              </button>
            )}
          </div>

          {/* ---- Right column -------------------------------------- */}
          <div className="space-y-5">
            {isManager ? <ManagerPanels ranked={ranked} /> : <PreparerPanels ranked={ranked} />}

            <div className="card p-4">
              <SectionTitle hint="Generated for this prototype, fixed seed.">
                Dataset
              </SectionTitle>
              <dl className="space-y-1.5 text-xs">
                {[
                  ["Clients", STATS.clients],
                  ["Returns", STATS.returns],
                  ["Source documents", STATS.documents],
                  ["Traceable return fields", STATS.fields],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="tabular font-medium text-ink-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function QueueRow({
  rank,
  item,
  open,
  onToggle,
}: {
  rank: number;
  item: RankedReturn;
  open: boolean;
  onToggle: () => void;
}) {
  const { ret, client, reasons, nextAction, daysToDue } = item;
  const overdue = daysToDue < 0;
  const conflict = ret.openItems.some((i) => i.kind === "Conflict");

  return (
    <div className={open ? "bg-ink-50" : "bg-surface transition-colors hover:bg-ink-50"}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="w-5 shrink-0 tabular text-xs font-semibold text-ink-300">{rank}</span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/returns/${ret.id}`}
              className="truncate text-sm font-medium text-ink-900 hover:text-act-700 hover:underline"
            >
              {client.name}
            </Link>
            <span className="shrink-0 font-mono text-2xs text-ink-400">
              {ret.form} · {ret.taxYear}
            </span>
            {conflict && (
              <Chip className="bg-stop-100 text-stop-700">
                <IconConflict size={10} /> Conflict
              </Chip>
            )}
            {ret.extended && <Chip className="bg-ink-100 text-ink-500">Extended</Chip>}
          </div>

          <div className="mt-1 flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-xs font-medium text-act-700">
              <IconArrowRight size={11} />
              {nextAction}
            </span>
            <StageRail stage={ret.stage} compact />
            <span className="text-2xs text-ink-400">{ret.stage}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`flex items-center justify-end gap-1 text-xs font-medium ${
              overdue ? "text-stop-700" : daysToDue <= 7 ? "text-warn-700" : "text-ink-500"
            }`}
          >
            <IconClock size={11} />
            {relativeDays(daysToDue)}
          </div>
          <div className="mt-0.5 flex items-center justify-end gap-1.5">
            {ret.unresolvedAiCount > 0 && (
              <Chip className="bg-ai-100 text-ai-700">
                <IconSparkle size={9} />
                {ret.unresolvedAiCount}
              </Chip>
            )}
            <button
              onClick={onToggle}
              className="flex items-center gap-0.5 text-2xs text-ink-400 hover:text-act-600"
              aria-expanded={open}
            >
              Why #{rank}
              <IconChevronDown
                size={11}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* The ranking is only trustworthy if it can be argued with. */}
      {open && (
        <div className="animate-fade-in border-t border-ink-200 bg-surface px-4 py-3 pl-12">
          <div className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-400">
            Priority score {item.score} — made up of
          </div>
          <div className="space-y-1.5">
            {reasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    reason.tone === "stop"
                      ? "bg-stop-600"
                      : reason.tone === "warn"
                        ? "bg-warn-600"
                        : reason.tone === "ai"
                          ? "bg-ai-500"
                          : "bg-ink-300"
                  }`}
                />
                <span className="flex-1 text-xs text-ink-700">{reason.label}</span>
                <span className="tabular text-2xs text-ink-400">
                  +{Math.round(reason.points)}
                </span>
              </div>
            ))}
          </div>

          {ret.openItems.length > 0 && (
            <div className="mt-3 border-t border-ink-100 pt-2.5">
              <div className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400">
                Open items
              </div>
              {ret.openItems.map((oi) => (
                <div key={oi.id} className="flex items-center gap-2 py-0.5">
                  <Chip
                    className={
                      oi.owner === "Client"
                        ? "bg-warn-100 text-warn-700"
                        : "bg-act-100 text-act-700"
                    }
                  >
                    {oi.owner}
                  </Chip>
                  <span className="flex-1 text-xs text-ink-700">{oi.label}</span>
                  <span className="text-2xs text-ink-400">{oi.ageDays}d</span>
                </div>
              ))}
            </div>
          )}

          <Link href={`/returns/${ret.id}`} className="btn-primary mt-3">
            Open return
            <IconArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PreparerPanels({ ranked }: { ranked: RankedReturn[] }) {
  const aiQueue = ranked
    .filter((r) => r.ret.unresolvedAiCount > 0 && r.ret.stage !== "Filed")
    .sort((a, b) => b.ret.unresolvedAiCount - a.ret.unresolvedAiCount)
    .slice(0, 5);

  const chase = ranked
    .filter((r) => r.ret.openItems.some((i) => i.owner === "Client"))
    .sort(
      (a, b) =>
        Math.max(...b.ret.openItems.map((i) => i.ageDays)) -
        Math.max(...a.ret.openItems.map((i) => i.ageDays)),
    )
    .slice(0, 5);

  return (
    <>
      <div className="card p-4">
        <SectionTitle hint="Heaviest extraction review first.">
          <span className="flex items-center gap-1.5">
            <IconSparkle size={14} className="text-ai-600" /> AI review queue
          </span>
        </SectionTitle>
        <div className="space-y-1">
          {aiQueue.map((r) => (
            <Link
              key={r.ret.id}
              href={`/returns/${r.ret.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ink-50"
            >
              <span className="min-w-0 flex-1 truncate text-xs text-ink-800">
                {r.client.name}
              </span>
              <Chip className="bg-ai-100 text-ai-700">{r.ret.unresolvedAiCount}</Chip>
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle hint="Longest wait first — these cost you nothing but a message.">
          <span className="flex items-center gap-1.5">
            <IconUser size={14} className="text-warn-600" /> Chase the client
          </span>
        </SectionTitle>
        <div className="space-y-1">
          {chase.map((r) => {
            const oldest = Math.max(...r.ret.openItems.map((i) => i.ageDays));
            return (
              <Link
                key={r.ret.id}
                href={`/returns/${r.ret.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ink-50"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-ink-800">
                  {r.client.name}
                </span>
                <span className="shrink-0 text-2xs text-warn-700">{oldest}d</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ManagerPanels({ ranked }: { ranked: RankedReturn[] }) {
  const necks = bottlenecks(ranked);
  const loads = workloads(ranked);
  const max = Math.max(...necks.map((n) => n.count), 1);

  return (
    <>
      <div className="card p-4">
        <SectionTitle hint="Where work is piling up, and how much of it is not ours to move.">
          Pipeline bottlenecks
        </SectionTitle>
        <div className="space-y-2">
          {necks.map((n) => (
            <div key={n.stage}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-700">{n.stage}</span>
                <span className="tabular text-ink-500">{n.count}</span>
              </div>
              <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-l-full bg-act-500"
                  style={{ width: `${((n.count - n.waitingOnClient) / max) * 100}%` }}
                  title={`${n.count - n.waitingOnClient} with the firm`}
                />
                <div
                  className="h-full rounded-r-full bg-warn-500"
                  style={{ width: `${(n.waitingOnClient / max) * 100}%` }}
                  title={`${n.waitingOnClient} waiting on the client`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-ink-100 pt-2 text-2xs text-ink-500">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-act-500" /> With the firm
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warn-500" /> Waiting on client
          </span>
        </div>
      </div>

      <div className="card p-4">
        <SectionTitle hint="Open load per person, not hours billed.">Capacity</SectionTitle>
        <div className="space-y-2.5">
          {loads.map((w) => {
            const role = getRole(w.role);
            return (
              <div key={w.role} className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-2xs font-semibold text-white">
                  {role.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-ink-800">{role.name}</div>
                  <div className="text-2xs text-ink-500">
                    {w.open} open · {w.hours}h logged
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {w.overdue > 0 && (
                    <Chip className="bg-stop-100 text-stop-700">
                      <IconAlert size={9} /> {w.overdue}
                    </Chip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
