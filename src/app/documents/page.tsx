"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Chip, EmptyState } from "@/components/ui";
import { DocumentSheet } from "@/components/trace/DocumentSheet";
import { allDocuments, getClient, getReturn } from "@/lib/data";
import { DOC_FAMILY } from "@/lib/docTemplates";
import { longDate, shortDate } from "@/lib/format";
import type { DocKind, TaxDocument } from "@/lib/types";
import {
  IconSearch,
  IconDoc,
  IconAlert,
  IconChevronDown,
  IconChevronRight,
  IconExternal,
  IconFilter,
} from "@/components/Icons";

const FAMILY_STYLE: Record<string, string> = {
  wage: "bg-act-100 text-act-700",
  invest: "bg-ai-100 text-ai-700",
  deduct: "bg-ok-100 text-ok-700",
  entity: "bg-warn-100 text-warn-700",
  other: "bg-ink-100 text-ink-600",
};

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-ink-500">Loading documents…</div>}>
      <DocumentLibrary />
    </Suspense>
  );
}

/**
 * The document library (Challenge 09).
 *
 * Roughly 1,700 documents live here. That number is the point: search,
 * faceting and grouping only prove anything against real volume, and a
 * hierarchy that works for twelve rows tells you nothing about one that has to
 * work for a season's worth of intake.
 *
 * The structure is three levels of disclosure — facet counts, then a grouped
 * list, then a full sheet preview — so someone can stay at whichever level
 * answers their question and go no deeper.
 */
function DocumentLibrary() {
  const params = useSearchParams();
  const returnFilter = params.get("return");

  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<Set<DocKind>>(new Set());
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<"client" | "kind" | "none">("kind");
  const [selected, setSelected] = useState<TaxDocument | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(60);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const scoped = useMemo(
    () => (returnFilter ? allDocuments.filter((d) => d.returnId === returnFilter) : allDocuments),
    [returnFilter],
  );

  const kindCounts = useMemo(() => {
    const map = new Map<DocKind, number>();
    for (const d of scoped) map.set(d.kind, (map.get(d.kind) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((d) => {
      if (kinds.size > 0 && !kinds.has(d.kind)) return false;
      if (flaggedOnly && d.status !== "Needs review" && !d.duplicateOf) return false;
      if (!q) return true;
      const client = getClient(d.clientId);
      return (
        d.issuer.toLowerCase().includes(q) ||
        d.kind.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (client?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [scoped, query, kinds, flaggedOnly]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "All documents", items: filtered }];
    const map = new Map<string, TaxDocument[]>();
    for (const d of filtered) {
      const key = groupBy === "kind" ? d.kind : (getClient(d.clientId)?.name ?? d.clientId);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return [...map.entries()]
      .map(([key, items]) => ({ key, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filtered, groupBy]);

  const flaggedCount = scoped.filter((d) => d.status === "Needs review" || d.duplicateOf).length;
  let rendered = 0;

  const toggleKind = (k: DocKind) => {
    const next = new Set(kinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setKinds(next);
    setLimit(60);
  };

  const toggleGroup = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
  };

  const scopedReturn = returnFilter ? getReturn(returnFilter) : undefined;

  return (
    <>
      <PageHeader
        crumbs={
          scopedReturn
            ? [
                { label: "Returns", href: "/returns" },
                {
                  label: getClient(scopedReturn.clientId)?.name ?? scopedReturn.id,
                  href: `/returns/${scopedReturn.id}`,
                },
                { label: "Source documents" },
              ]
            : undefined
        }
        title="Documents"
        subtitle={
          <span>
            {filtered.length.toLocaleString()} of {scoped.length.toLocaleString()} documents
            {scopedReturn ? " on this return" : " across the firm"}
          </span>
        }
        actions={
          scopedReturn ? (
            <Link href={`/returns/${scopedReturn.id}`} className="btn-ghost">
              Back to return
            </Link>
          ) : undefined
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* ---- Facets --------------------------------------------------- */}
        <aside className="w-56 shrink-0 overflow-y-auto scroll-slim border-r border-ink-200 bg-surface px-3 py-3">
          <div className="mb-3 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
            <IconFilter size={11} /> Filter
          </div>

          <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-md bg-warn-50 px-2 py-1.5 text-xs text-warn-700">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-warn-600"
            />
            <IconAlert size={11} className="text-warn-600" />
            Needs attention
            <span className="ml-auto tabular text-2xs">{flaggedCount}</span>
          </label>

          <div className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400">
            Document type
          </div>
          {kindCounts.map(([kind, count]) => {
            const on = kinds.has(kind);
            return (
              <button
                key={kind}
                onClick={() => toggleKind(kind)}
                aria-pressed={on}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs ${
                  on ? "bg-act-50 font-medium text-act-700" : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-sm ${
                    FAMILY_STYLE[DOC_FAMILY[kind]].split(" ")[0]
                  }`}
                />
                <span className="flex-1 truncate">{kind}</span>
                <span className="tabular text-2xs text-ink-400">{count}</span>
              </button>
            );
          })}

          {kinds.size > 0 && (
            <button
              onClick={() => setKinds(new Set())}
              className="mt-2 w-full rounded-md px-2 py-1 text-left text-2xs text-act-600 hover:underline"
            >
              Clear {kinds.size} type filter{kinds.size > 1 ? "s" : ""}
            </button>
          )}

          <div className="mt-4 border-t border-ink-100 pt-3">
            <div className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400">
              Group by
            </div>
            {(["kind", "client", "none"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                aria-pressed={groupBy === g}
                className={`mb-0.5 block w-full rounded-md px-2 py-1 text-left text-xs capitalize ${
                  groupBy === g ? "bg-act-50 font-medium text-act-700" : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                {g === "none" ? "Nothing" : g}
              </button>
            ))}
          </div>
        </aside>

        {/* ---- List ------------------------------------------------------ */}
        <div className="flex min-w-0 flex-1 flex-col bg-ink-100">
          <div className="shrink-0 border-b border-ink-200 bg-surface px-4 py-2">
            <div className="flex items-center gap-2 rounded-md border border-ink-300 bg-surface px-2.5 py-1.5 focus-within:border-act-600">
              <IconSearch size={14} className="shrink-0 text-ink-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(60);
                }}
                placeholder="Search by issuer, client, type or document ID…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-ink-400"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-2xs text-ink-400 hover:text-ink-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scroll-slim px-4 py-3">
            {filtered.length === 0 ? (
              <EmptyState
                title="No documents match"
                body="Clear a filter or search for a different issuer."
              />
            ) : (
              <>
                {groups.map((g) => {
                  if (rendered >= limit) return null;
                  const isCollapsed = collapsed.has(g.key);
                  const slice = isCollapsed ? [] : g.items.slice(0, Math.max(0, limit - rendered));
                  rendered += slice.length;

                  return (
                    <section key={g.key} className="mb-3">
                      <button
                        onClick={() => toggleGroup(g.key)}
                        className="mb-1.5 flex w-full items-center gap-1.5 text-left"
                      >
                        <IconChevronDown
                          size={12}
                          className={`text-ink-400 transition-transform ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />
                        <span className="text-xs font-semibold text-ink-700">{g.key}</span>
                        <span className="tabular text-2xs text-ink-400">{g.items.length}</span>
                      </button>

                      {!isCollapsed && (
                        <div className="card divide-y divide-ink-100 overflow-hidden">
                          {slice.map((d) => (
                            <DocRow
                              key={d.id}
                              doc={d}
                              active={selected?.id === d.id}
                              onSelect={() => {
                                setSelected(d);
                                setPage(1);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}

                {rendered < filtered.length && (
                  <button onClick={() => setLimit((l) => l + 60)} className="btn-ghost w-full">
                    Show more ({filtered.length - rendered} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ---- Preview ---------------------------------------------------- */}
        <aside className="w-[400px] shrink-0 overflow-y-auto scroll-slim border-l border-ink-200 bg-surface">
          {selected ? (
            <DocPreview doc={selected} page={page} onPage={setPage} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100">
                <IconDoc size={19} className="text-ink-400" />
              </div>
              <div className="mt-3 text-sm font-medium text-ink-800">Pick a document</div>
              <p className="mt-1.5 max-w-[15rem] text-xs leading-relaxed text-ink-500">
                Every document opens to the same reader used in return review, so what you
                see here is what a reviewer sees when they trace a number back.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function DocRow({
  doc,
  active,
  onSelect,
}: {
  doc: TaxDocument;
  active: boolean;
  onSelect: () => void;
}) {
  const client = getClient(doc.clientId);
  const flagged = doc.status === "Needs review" || Boolean(doc.duplicateOf);

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
        active ? "bg-act-50" : "bg-surface hover:bg-ink-50"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
          FAMILY_STYLE[DOC_FAMILY[doc.kind]]
        }`}
      >
        <IconDoc size={13} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-ink-900">{doc.issuer}</span>
          {doc.duplicateOf && <Chip className="bg-stop-100 text-stop-700">Duplicate</Chip>}
          {doc.status === "Needs review" && !doc.duplicateOf && (
            <Chip className="bg-warn-100 text-warn-700">Low quality scan</Chip>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-500">
          <span>{doc.kind}</span>
          <span className="text-ink-300">·</span>
          <span className="truncate">{client?.name}</span>
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-2xs text-ink-500">{shortDate(doc.receivedAt)}</span>
        <span
          className={`block text-2xs ${flagged ? "text-warn-700" : "text-ink-400"}`}
          title={`Extraction quality ${Math.round(doc.extractionQuality * 100)}%`}
        >
          {Math.round(doc.extractionQuality * 100)}% read
        </span>
      </span>
    </button>
  );
}

function DocPreview({
  doc,
  page,
  onPage,
}: {
  doc: TaxDocument;
  page: number;
  onPage: (p: number) => void;
}) {
  const client = getClient(doc.clientId);

  return (
    <div className="p-4">
      <div className="mb-3">
        <div className="flex items-center gap-1.5">
          <Chip className={FAMILY_STYLE[DOC_FAMILY[doc.kind]]}>{doc.kind}</Chip>
          {doc.duplicateOf && <Chip className="bg-stop-100 text-stop-700">Duplicate</Chip>}
        </div>
        <h2 className="mt-1.5 text-sm font-semibold text-ink-900">{doc.issuer}</h2>
        <Link
          href={`/returns/${doc.returnId}`}
          className="mt-0.5 flex items-center gap-1 text-2xs text-act-600 hover:underline"
        >
          {client?.name} · open return <IconExternal size={10} />
        </Link>
      </div>

      <DocumentSheet doc={doc} page={page} onPageChange={onPage} />

      <dl className="mt-4 space-y-1.5 text-2xs">
        {[
          ["Received", longDate(doc.receivedAt)],
          ["Source", doc.source],
          ["Pages", String(doc.pages.length)],
          ["Size", `${doc.sizeKb.toLocaleString()} KB`],
          ["Extraction quality", `${Math.round(doc.extractionQuality * 100)}%`],
          ["Status", doc.status],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-ink-100 pb-1">
            <dt className="text-ink-500">{k}</dt>
            <dd className="font-medium text-ink-800">{v}</dd>
          </div>
        ))}
      </dl>

      {doc.duplicateOf && (
        <div className="mt-3 rounded-md border border-stop-600/30 bg-stop-50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <IconAlert size={13} className="mt-0.5 shrink-0 text-stop-600" />
            <div className="text-2xs leading-relaxed text-ink-700">
              This looks like a second copy of{" "}
              <span className="font-mono">{doc.duplicateOf}</span>. It has been left out of
              the return total until someone confirms which reading is right.
            </div>
          </div>
        </div>
      )}

      {doc.extractionQuality < 0.8 && (
        <div className="mt-3 rounded-md border border-warn-600/30 bg-warn-50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <IconChevronRight size={13} className="mt-0.5 shrink-0 text-warn-600" />
            <div className="text-2xs leading-relaxed text-ink-700">
              Parts of this scan came through poorly. Values read from it are marked as
              lower confidence on the return.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
