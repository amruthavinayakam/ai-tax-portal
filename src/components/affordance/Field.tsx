"use client";

import { useEffect, useRef, useState } from "react";
import type { ReturnField } from "@/lib/types";
import { money } from "@/lib/format";
import { FIELD_STATES, bandFor } from "./states";
import { IconUndo } from "@/components/Icons";
import type { FieldOverride } from "@/components/store";

interface FieldValueProps {
  field: ReturnField & { override?: FieldOverride };
  selected?: boolean;
  onInspect?: () => void;
  onCommit?: (value: number) => void;
  /** Compact rendering for dense lists. */
  dense?: boolean;
}

/**
 * The single rendering path for a value in this product.
 *
 * Whether it appears in the return, a summary card or the design reference, a
 * value goes through here. That is the mechanism behind the consistency —
 * there is no second way to draw a number, so a state cannot look one way on
 * one screen and another way elsewhere.
 */
export function FieldValue({
  field,
  selected,
  onInspect,
  onCommit,
  dense,
}: FieldValueProps) {
  const meta = FIELD_STATES[field.state];
  const Icon = meta.icon;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(field.value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setDraft(String(field.value));
  }, [field.value]);

  const commit = () => {
    setEditing(false);
    const parsed = Number(draft.replace(/[^0-9.-]/g, ""));
    if (!Number.isNaN(parsed) && parsed !== field.value) onCommit?.(parsed);
    else setDraft(String(field.value));
  };

  // Plain editable fields type in place. AI-touched fields deliberately do not:
  // changing one is a decision with a reason attached, so it routes through the
  // review panel instead of a silent inline edit.
  const typesInPlace = field.state === "editable" && Boolean(onCommit);

  if (editing && typesInPlace) {
    return (
      <div className={`field-base field-editable ${dense ? "py-1" : ""}`}>
        <span className="text-ink-400 text-xs">$</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(String(field.value));
              setEditing(false);
            }
          }}
          className="w-full bg-transparent text-right text-sm tabular outline-none"
          aria-label={`${field.label} value`}
        />
      </div>
    );
  }

  const interactive = meta.inspectable || typesInPlace;
  const Tag = interactive ? "button" : "div";

  // A field's accessible name has to carry the line it belongs to — otherwise a
  // screen-reader user tabbing a return hears value after value with no way to
  // tell wages from dividends. The DOM label lives in a sibling row, so the
  // control names itself here: line, label, state, confidence band, and value.
  const valueText =
    field.state === "locked" && field.value === 0 ? "no value yet" : money(field.value);
  const srLabel = [
    field.line,
    field.label,
    meta.name,
    field.ai && field.state !== "verified" ? bandFor(field.ai.confidence).label : null,
    valueText,
    field.lockReason,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={
        interactive
          ? () => {
              if (typesInPlace) setEditing(true);
              else onInspect?.();
            }
          : undefined
      }
      aria-label={srLabel}
      title={meta.rule + (field.lockReason ? ` — ${field.lockReason}` : "")}
      className={`field-base ${meta.className} ${selected ? "field-selected" : ""} ${
        dense ? "py-1" : ""
      } group`}
    >
      <span className="flex items-center gap-1.5">
        <Icon
          size={dense ? 12 : 13}
          className={
            field.state === "ai-unverified"
              ? "text-ai-600"
              : field.state === "verified"
                ? "text-ok-600"
                : field.state === "needs-approval"
                  ? "text-warn-600"
                  : "text-ink-400"
          }
        />
        {/* Confidence rides next to the AI marker, never as a bare number. */}
        {field.ai && field.state !== "verified" && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${bandFor(field.ai.confidence).bar}`}
            title={`${bandFor(field.ai.confidence).label} — ${Math.round(field.ai.confidence * 100)}%`}
          />
        )}
        {field.override?.correctedFrom !== undefined && (
          <IconUndo size={11} className="text-ink-400" />
        )}
      </span>

      <span
        className={`tabular text-sm font-medium ${
          field.state === "locked" ? "text-ink-400" : "text-ink-900"
        }`}
      >
        {field.state === "locked" && field.value === 0 ? "—" : money(field.value)}
      </span>
    </Tag>
  );
}

/* ------------------------------------------------------------------ */

interface FieldRowProps extends FieldValueProps {
  showForm?: boolean;
}

/** A labelled line on the return. */
export function FieldRow({ field, showForm = true, ...rest }: FieldRowProps) {
  const meta = FIELD_STATES[field.state];

  return (
    <div
      className={`flex items-center gap-4 border-b border-ink-100 px-4 py-2 transition-colors ${
        rest.selected ? "bg-act-50" : "hover:bg-ink-50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {showForm && (
            <span className="shrink-0 font-mono text-2xs text-ink-400">{field.line}</span>
          )}
          <span className="truncate text-sm text-ink-800" title={field.label}>
            {field.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-ink-500">
          <span>{meta.name}</span>
          {field.ai && (
            <>
              <span className="text-ink-300">·</span>
              <span className="truncate" title={field.ai.summary}>
                {field.ai.summary}
              </span>
            </>
          )}
          {field.lockReason && (
            <>
              <span className="text-ink-300">·</span>
              <span className="truncate" title={field.lockReason}>
                {field.lockReason}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="w-40 shrink-0">
        <FieldValue field={field} {...rest} />
      </div>
    </div>
  );
}
