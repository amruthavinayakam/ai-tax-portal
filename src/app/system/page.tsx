"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { AffordanceLegend, Chip, ConfidenceMeter, SectionTitle } from "@/components/ui";
import { FieldValue } from "@/components/affordance/Field";
import { FIELD_STATES, STATE_ORDER, VERDICTS, BANDS } from "@/components/affordance/states";
import { featuredReturns, getClient, getFields } from "@/lib/data";
import type { AiVerdict, ReturnField } from "@/lib/types";
import Link from "next/link";
import { IconArrowRight } from "@/components/Icons";

/**
 * The interaction system, stated explicitly (Challenge 08).
 *
 * A design system page is not decoration in a product like this. Six roles and
 * a seasonal workforce means the visual language has to be teachable in a
 * couple of minutes, and the fastest way to teach it is to show every state
 * side by side with the rule that governs it.
 */
export default function SystemPage() {
  const [demo, setDemo] = useState<Record<string, number>>({});

  const sample = (state: ReturnField["state"], id: string): ReturnField => ({
    id: `demo-${id}`,
    returnId: "demo",
    form: "Form 1040",
    line: "Line 1a",
    label: "Sample value",
    value: demo[id] ?? 84_500,
    state,
    section: "income",
    lockReason:
      state === "locked"
        ? "Locked until the client signs Form 8879. Only the taxpayer can supply this."
        : undefined,
    ai:
      state === "ai-unverified" || state === "needs-approval" || state === "verified"
        ? {
            verdict: "extracted",
            confidence: state === "needs-approval" ? 0.63 : 0.96,
            summary: "Read Box 1 from the Halcyon Systems W-2.",
            transform: [],
            evidence: [],
            recommendation: "Accept.",
          }
        : undefined,
  });

  const featured = featuredReturns().slice(0, 3);

  return (
    <>
      <PageHeader
        title="Interaction system"
        subtitle="The rules every screen in this prototype follows, and why they are what they are."
      />

      <div className="flex-1 overflow-y-auto scroll-slim bg-ink-100 px-6 py-5">
        <div className="mx-auto max-w-4xl space-y-5">
          {/* ---- The core split -------------------------------------- */}
          <div className="card p-5">
            <SectionTitle hint="One decision that the rest of the language hangs off.">
              Blue means you can act. Violet means a machine did something.
            </SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-act-500/30 bg-act-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-act-600" />
                  <span className="text-xs font-semibold text-act-700">Interactive</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-700">
                  Links, buttons, focus rings, the selected row. If it is blue, clicking it
                  does something.
                </p>
              </div>
              <div className="rounded-lg border border-ai-500/30 bg-ai-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-ai-600" />
                  <span className="text-xs font-semibold text-ai-700">Machine-generated</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-700">
                  Extracted values, confidence, recommendations. Violet never means
                  &ldquo;clickable&rdquo;, so AI presence can never be mistaken for an
                  invitation to click.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-600">
              Most products fail this by using their brand colour for both, and users learn
              that the accent colour means nothing in particular. Keeping the two channels
              separate is what lets someone glance at a return and see, without reading a
              word, how much of it a machine touched.
            </p>
          </div>

          {/* ---- States ---------------------------------------------- */}
          <div className="card p-5">
            <SectionTitle hint="Click them. Editable fields type in place; AI fields open a review.">
              Every state a value can be in
            </SectionTitle>

            <div className="mt-3 overflow-hidden rounded-lg border border-ink-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left">
                    <th className="px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                      State
                    </th>
                    <th className="px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                      Rule
                    </th>
                    <th className="w-40 px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                      Renders as
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {STATE_ORDER.map((id) => {
                    const meta = FIELD_STATES[id];
                    const Icon = meta.icon;
                    return (
                      <tr key={id} className="border-b border-ink-100 last:border-0">
                        <td className="px-3 py-2.5 align-top">
                          <Chip className={meta.chip}>
                            <Icon size={10} />
                            {meta.name}
                          </Chip>
                        </td>
                        <td className="px-3 py-2.5 align-top text-xs leading-relaxed text-ink-600">
                          {meta.rule}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <FieldValue
                            field={sample(id, id)}
                            onCommit={(v) => setDemo((d) => ({ ...d, [id]: v }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink-600">
              Colour is never the only signal. Each state also carries its own border
              treatment — solid, dashed, hatched, none — and its own icon, so the system
              survives greyscale printing and colour vision deficiency. The dashed border on
              an AI value is doing real work: a full solid box would read as settled, and
              the whole point is that it is not settled yet.
            </p>
          </div>

          {/* ---- Confidence ------------------------------------------ */}
          <div className="card p-5">
            <SectionTitle hint="Why bands instead of a percentage.">
              Confidence
            </SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              {[0.97, 0.84, 0.62].map((c) => (
                <div key={c} className="rounded-lg border border-ink-200 p-3">
                  <ConfidenceMeter confidence={c} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-600">
              A reviewer cannot behave differently at 87% than at 84%, so showing the raw
              number as the headline invites false precision. The bands map to three
              genuinely different behaviours —{" "}
              {BANDS.map((b) => b.guidance.toLowerCase().replace(/\.$/, "")).join(", ")} — and
              the exact figure is still there on hover for anyone who wants it.
            </p>
          </div>

          {/* ---- Verdicts -------------------------------------------- */}
          <div className="card p-5">
            <SectionTitle hint="What the AI concluded, in words a client could read.">
              AI verdicts
            </SectionTitle>
            <div className="space-y-2">
              {(Object.keys(VERDICTS) as AiVerdict[]).map((v) => {
                const meta = VERDICTS[v];
                const Icon = meta.icon;
                return (
                  <div key={v} className="flex items-start gap-3 rounded-md border border-ink-200 px-3 py-2">
                    <Chip className={meta.chip}>
                      <Icon size={10} />
                      {meta.name}
                    </Chip>
                    <span className="flex-1 text-xs leading-relaxed text-ink-600">
                      {meta.blurb}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---- Legend ---------------------------------------------- */}
          <div className="card p-5">
            <SectionTitle hint="Reachable from the return header on every screen.">
              The in-product legend
            </SectionTitle>
            <AffordanceLegend columns={2} />
          </div>

          {/* ---- Jump into the edge cases ---------------------------- */}
          <div className="card p-5">
            <SectionTitle hint="Returns in the dataset that exercise the awkward states.">
              See it under pressure
            </SectionTitle>
            <div className="space-y-1.5">
              {featured.map((r) => {
                const client = getClient(r.clientId)!;
                const interesting = getFields(r.id).filter(
                  (f) => f.ai && ["conflict", "missing-source", "anomaly"].includes(f.ai.verdict),
                );
                return (
                  <Link
                    key={r.id}
                    href={`/returns/${r.id}`}
                    className="flex items-center gap-3 rounded-md border border-ink-200 px-3 py-2.5 hover:border-act-500 hover:bg-act-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-ink-900">
                        {client.name}
                      </span>
                      <span className="block truncate text-2xs text-ink-500">
                        {interesting.map((f) => VERDICTS[f.ai!.verdict].name).join(" · ")}
                      </span>
                    </span>
                    <IconArrowRight size={14} className="shrink-0 text-ink-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
