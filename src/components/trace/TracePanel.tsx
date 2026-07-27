"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EvidenceItem, ReturnField, TransformStep } from "@/lib/types";
import { getDocument } from "@/lib/data";
import { money, longDate } from "@/lib/format";
import { useStore, type FieldOverride } from "@/components/store";
import { DocumentSheet } from "./DocumentSheet";
import { Chip, ConfidenceMeter } from "@/components/ui";
import { FIELD_STATES, VERDICTS } from "@/components/affordance/states";
import {
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconDoc,
  IconLock,
  IconPencil,
  IconSigma,
  IconSparkle,
  IconUndo,
  IconX,
} from "@/components/Icons";

/**
 * The inspector (Challenges 01 and 10).
 *
 * One panel answers four questions in a fixed order, top to bottom:
 *
 *   1. What is this number, and how sure is the machine?
 *   2. Which document did it come from, and where exactly on it?
 *   3. What was done to it between the document and the return?
 *   4. What should I do about it?
 *
 * The order is the design. Transparency that opens with a derivation tree is
 * transparency nobody reads; transparency that opens with a one-line summary
 * and lets you descend as far as you want is the version people actually use.
 */
export function TracePanel({
  field,
  onClose,
  onAdvance,
}: {
  field: ReturnField & { override?: FieldOverride };
  onClose?: () => void;
  /**
   * Present only when another unresolved value is waiting. Resolving this one
   * — by any path, accept, chosen reading, or saved correction — moves
   * straight to the next one instead of leaving the reviewer to find a
   * second, separate "next" control.
   */
  onAdvance?: () => void;
}) {
  const { accept, correct, flag, revert } = useStore();
  const meta = FIELD_STATES[field.state];

  const evidence = field.ai?.evidence ?? [];
  const [activeEvidence, setActiveEvidence] = useState(0);
  const [mode, setMode] = useState<"idle" | "correcting" | "flagging">("idle");
  const [draftValue, setDraftValue] = useState(String(field.value));
  const [note, setNote] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Changing field resets the panel — it is the same component, but a new
  // subject, and carrying a half-typed correction, or a scroll position left
  // over from the previous value's derivation chain, across would be a bug.
  useEffect(() => {
    setActiveEvidence(0);
    setMode("idle");
    setDraftValue(String(field.value));
    setNote("");
    bodyRef.current?.scrollTo({ top: 0 });
  }, [field.id, field.value]);

  const active: EvidenceItem | undefined = evidence[activeEvidence];
  const activeDoc = active ? getDocument(active.documentId) : undefined;
  const [page, setPage] = useState(active?.page ?? 1);
  useEffect(() => setPage(active?.page ?? 1), [active?.documentId, active?.page]);

  const sameDocRegions = useMemo(
    () =>
      evidence
        .filter((e) => e.documentId === active?.documentId)
        .map((e) => e.regionId),
    [evidence, active?.documentId],
  );

  // A correction must parse to a dollar amount. Rather than the Save button
  // silently doing nothing on bad input, the value is validated as the user
  // types: the error names the problem and Save stays disabled until it clears.
  // The check is on the whole string, not just the digits within it — otherwise
  // "abc" strips to "" (parses as 0) and "12x" strips to "12", both silently
  // saving a plausible-looking wrong number instead of being rejected.
  const cleanedDraft = draftValue.trim().replace(/,/g, "");
  const parsedDraft = Number(cleanedDraft);
  const draftValid = /^-?\d+(\.\d+)?$/.test(cleanedDraft) && Number.isFinite(parsedDraft);

  const submitCorrection = () => {
    if (!draftValid) return;
    correct(field, parsedDraft, note);
    setMode("idle");
    setNote("");
    onAdvance?.();
  };

  // Escape backs out one level at a time: out of a correct/flag sub-form
  // first, then out of the panel — never both at once.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mode !== "idle") setMode("idle");
      else onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onClose]);

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* ---- Subject ------------------------------------------------ */}
      <div className="shrink-0 border-b border-ink-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-2xs text-ink-400">
              {field.form} · {field.line}
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-ink-900">
              {field.label}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Close inspector"
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <Chip className={meta.chip} title={meta.rule}>
            <meta.icon size={10} />
            {meta.name}
          </Chip>
          <div className="tabular text-lg font-semibold text-ink-900">{money(field.value)}</div>
        </div>

        {field.override?.correctedFrom !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-ink-50 px-2 py-1.5 text-2xs text-ink-600">
            <IconUndo size={11} className="shrink-0 text-ink-400" />
            <span className="flex-1">
              You changed this from{" "}
              <span className="tabular font-medium">
                {money(field.override.correctedFrom)}
              </span>
              . The original extraction is kept.
            </span>
            <button
              onClick={() => revert(field)}
              className="shrink-0 font-medium text-act-600 hover:underline"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {/* ---- Body --------------------------------------------------- */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto scroll-slim">
        {field.state === "locked" ? (
          <LockedNotice reason={field.lockReason} />
        ) : !field.ai ? (
          <NoAiNotice field={field} />
        ) : (
          <>
            {/* 1 — What and how sure ------------------------------- */}
            <section className="border-b border-ink-100 px-4 py-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <Chip className={VERDICTS[field.ai.verdict].chip}>
                  {(() => {
                    const V = VERDICTS[field.ai.verdict].icon;
                    return <V size={10} />;
                  })()}
                  {VERDICTS[field.ai.verdict].name}
                </Chip>
              </div>
              <p className="text-sm leading-relaxed text-ink-800">{field.ai.summary}</p>
              <div className="mt-3">
                <ConfidenceMeter confidence={field.ai.confidence} />
              </div>
            </section>

            {/* Uncertainty, stated plainly and early ---------------- */}
            {field.ai.uncertainty && (
              <section className="border-b border-ink-100 bg-warn-50 px-4 py-3">
                <div className="flex gap-2">
                  <IconAlert size={14} className="mt-0.5 shrink-0 text-warn-600" />
                  <div>
                    <div className="text-2xs font-semibold uppercase tracking-wide text-warn-700">
                      What the AI could not determine
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-700">
                      {field.ai.uncertainty}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 2 — Where it came from ------------------------------- */}
            {evidence.length > 0 && activeDoc && (
              <section className="border-b border-ink-100 px-4 py-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                    <IconDoc size={12} /> Source
                  </h3>
                  <span className="text-2xs text-ink-400">
                    {evidence.length} document{evidence.length > 1 ? "s" : ""}
                  </span>
                </div>

                {evidence.length > 1 && (
                  <div className="mb-2.5 space-y-1">
                    {evidence.map((e, i) => {
                      const d = getDocument(e.documentId);
                      const on = i === activeEvidence;
                      return (
                        <button
                          key={`${e.documentId}-${e.regionId}`}
                          onClick={() => setActiveEvidence(i)}
                          className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ${
                            on
                              ? "border-ai-500 bg-ai-50"
                              : "border-ink-200 bg-surface hover:bg-ink-50"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              on ? "bg-ai-600" : "bg-ink-300"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-ink-800">
                              {d?.issuer}
                            </span>
                            <span className="block truncate text-2xs text-ink-500">
                              {d?.kind} · {e.note}
                            </span>
                          </span>
                          {d?.duplicateOf && (
                            <Chip className="bg-stop-100 text-stop-700">Duplicate</Chip>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-md bg-ink-100 p-2.5">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-2xs font-medium text-ink-700">
                      {activeDoc.kind} — {activeDoc.issuer}
                    </span>
                    <span className="text-2xs text-ink-400">
                      Received {longDate(activeDoc.receivedAt)}
                    </span>
                  </div>
                  <DocumentSheet
                    doc={activeDoc}
                    page={page}
                    onPageChange={setPage}
                    highlightRegionIds={sameDocRegions}
                    primaryRegionId={active?.regionId}
                  />
                  <p className="mt-2 flex items-start gap-1 text-2xs leading-relaxed text-ink-600">
                    <IconChevronRight size={10} className="mt-0.5 shrink-0 text-ai-600" />
                    Highlighted: {active?.note} · page {active?.page}
                  </p>
                </div>
              </section>
            )}

            {/* 3 — What was done to it ----------------------------- */}
            <section className="border-b border-ink-100 px-4 py-3.5">
              <h3 className="mb-2.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                <IconSigma size={12} /> How this number was reached
              </h3>
              <Derivation steps={field.ai.transform} />
            </section>

            {/* 4 — What to do -------------------------------------- *
             * When the sources conflict, choosing a reading IS the decision,
             * so it is the one primary path: the suggested reading is a filled
             * button, the alternative a quiet outline. The action bar below
             * drops its generic Accept for these fields so there is a single
             * obvious way forward, not six competing ones. */}
            {field.ai.alternatives && field.state !== "verified" && (
              <section className="border-b border-ink-100 px-4 py-3.5">
                <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Choose a reading
                </h3>
                <div className="space-y-1.5">
                  {field.ai.alternatives.map((alt, i) => {
                    const suggested = i === 0;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          correct(field, alt.value, alt.note);
                          onAdvance?.();
                        }}
                        className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                          suggested
                            ? "bg-act-600 hover:bg-act-700"
                            : "border border-ink-300 hover:border-act-500 hover:bg-act-50"
                        }`}
                      >
                        <span
                          className={`tabular shrink-0 text-sm font-semibold ${
                            suggested ? "text-white" : "text-ink-900"
                          }`}
                        >
                          {money(alt.value)}
                        </span>
                        <span
                          className={`flex-1 text-2xs leading-relaxed ${
                            suggested ? "text-white/85" : "text-ink-600"
                          }`}
                        >
                          {alt.note}
                        </span>
                        {suggested && (
                          <Chip className="bg-white/20 text-white">Suggested</Chip>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="px-4 py-3.5">
              <div className="rounded-md border border-act-500/30 bg-act-50 px-3 py-2.5">
                <div className="text-2xs font-semibold uppercase tracking-wide text-act-700">
                  Recommended next step
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-700">
                  {field.ai.recommendation}
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ---- Action bar --------------------------------------------- */}
      {field.ai && field.state !== "locked" && (
        <div className="shrink-0 border-t border-ink-200 bg-ink-50 px-4 py-3">
          {mode === "idle" && (
            <div className="flex items-center gap-2">
              {field.state === "verified" ? (
                <>
                  <span className="flex flex-1 items-center gap-1.5 text-xs font-medium text-ok-700">
                    <IconCheck size={13} /> Verified by you
                  </span>
                  <button onClick={() => setMode("correcting")} className="btn-ghost">
                    <IconPencil size={12} /> Change
                  </button>
                </>
              ) : field.ai.alternatives ? (
                // Conflict: the reading buttons above are the accept path, so the
                // bar only carries the two escapes.
                <>
                  <span className="flex-1 text-2xs text-ink-500">
                    Choose a reading above, or:
                  </span>
                  <button onClick={() => setMode("correcting")} className="btn-ghost">
                    <IconPencil size={12} /> Enter another amount
                  </button>
                  <button onClick={() => setMode("flagging")} className="btn-ghost">
                    <IconAlert size={12} /> Ask client
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      accept(field);
                      onAdvance?.();
                    }}
                    className="btn-primary flex-1"
                  >
                    {onAdvance ? (
                      <>
                        <IconChevronRight size={13} /> Accept and go to next
                      </>
                    ) : (
                      <>
                        <IconCheck size={13} /> Accept {money(field.value)}
                      </>
                    )}
                  </button>
                  <button onClick={() => setMode("correcting")} className="btn-ghost">
                    <IconPencil size={12} /> Correct
                  </button>
                  <button onClick={() => setMode("flagging")} className="btn-ghost">
                    <IconAlert size={12} /> Ask
                  </button>
                </>
              )}
            </div>
          )}

          {/* Correction happens in place. Nothing navigates, nothing is lost. */}
          {mode === "correcting" && (
            <div className="animate-fade-in space-y-2">
              <label className="block text-2xs font-medium uppercase tracking-wide text-ink-500">
                Corrected value
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`flex flex-1 items-center gap-1 rounded-md border bg-surface px-2.5 py-1.5 ${
                    draftValid
                      ? "border-ink-300 focus-within:border-act-600"
                      : "border-stop-600/60 focus-within:border-stop-600"
                  }`}
                >
                  <span className="text-xs text-ink-400">$</span>
                  <input
                    autoFocus
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitCorrection()}
                    aria-invalid={!draftValid}
                    aria-describedby="correction-error"
                    className="tabular w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <span className="text-2xs text-ink-400">
                  was {money(field.ai.transform.at(-1)?.amount ?? field.value)}
                </span>
              </div>
              {!draftValid && (
                <p id="correction-error" className="flex items-center gap-1 text-2xs text-stop-700">
                  <IconAlert size={11} /> Enter a dollar amount, like 12500.
                </p>
              )}
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCorrection()}
                placeholder="Why? (optional — kept with the return's history)"
                className="w-full rounded-md border border-ink-300 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-act-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitCorrection}
                  disabled={!draftValid}
                  className="btn-primary flex-1"
                >
                  Save correction
                </button>
                <button onClick={() => setMode("idle")} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === "flagging" && (
            <div className="animate-fade-in space-y-2">
              <label className="block text-2xs font-medium uppercase tracking-wide text-ink-500">
                Send back as an open question
              </label>
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What do you need from the client?"
                className="w-full rounded-md border border-ink-300 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-act-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    flag(field, note || "Flagged for follow-up.");
                    setMode("idle");
                    setNote("");
                  }}
                  className="btn-primary flex-1"
                >
                  Flag for follow-up
                </button>
                <button onClick={() => setMode("idle")} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The derivation chain.
 *
 * Drawn as a running ledger rather than a tree: every step shows its own
 * amount, so a reviewer can check the arithmetic by eye without expanding
 * anything. Limits and adjustments are visually distinct from plain sources
 * because those are the steps people actually dispute.
 */
function Derivation({ steps }: { steps: TransformStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const emphasis = s.kind === "result" || s.kind === "sum";
        const rule = s.kind === "limit" || s.kind === "adjust";

        return (
          <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
            {/* rail */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  rule ? "bg-warn-500" : emphasis ? "bg-ai-600" : "bg-ink-300"
                }`}
              />
              {!last && <span className="w-px flex-1 bg-ink-200" />}
            </div>

            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`text-xs ${
                    emphasis ? "font-semibold text-ink-900" : "text-ink-700"
                  }`}
                >
                  {s.label}
                </span>
                {s.amount !== undefined && (
                  <span
                    className={`tabular shrink-0 text-xs ${
                      emphasis ? "font-semibold text-ink-900" : "text-ink-600"
                    }`}
                  >
                    {money(s.amount)}
                  </span>
                )}
              </div>
              {s.detail && (
                <p
                  className={`mt-0.5 text-2xs leading-relaxed ${
                    rule ? "text-warn-700" : "text-ink-500"
                  }`}
                >
                  {s.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LockedNotice({ reason }: { reason?: string }) {
  return (
    <div className="px-4 py-6">
      <div className="flex gap-2.5 rounded-md border border-ink-200 bg-ink-50 p-3">
        <IconLock size={15} className="mt-0.5 shrink-0 text-ink-400" />
        <div>
          <div className="text-xs font-medium text-ink-800">This field is locked</div>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            {reason ?? "This value cannot be changed from here."}
          </p>
        </div>
      </div>
      <p className="mt-3 text-2xs leading-relaxed text-ink-500">
        A locked field always says why it is locked and what would unlock it. Grey with
        no explanation is how software teaches people to stop reading.
      </p>
    </div>
  );
}

function NoAiNotice({ field }: { field: ReturnField }) {
  const meta = FIELD_STATES[field.state];
  return (
    <div className="px-4 py-6">
      <div className="flex gap-2.5 rounded-md border border-ink-200 bg-surface p-3">
        <meta.icon size={15} className="mt-0.5 shrink-0 text-ink-400" />
        <div>
          <div className="text-xs font-medium text-ink-800">{meta.name}</div>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">{meta.rule}</p>
        </div>
      </div>
      {field.state === "calculated" && (
        <p className="mt-3 flex items-start gap-1.5 text-2xs leading-relaxed text-ink-500">
          <IconSparkle size={11} className="mt-0.5 shrink-0 text-ink-300" />
          No AI was involved in this line. It is arithmetic over other lines on this
          return, which is why it carries no confidence score — there is nothing to be
          uncertain about.
        </p>
      )}
    </div>
  );
}
