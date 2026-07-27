"use client";

import { useEffect, useRef, useState } from "react";
import type { TaxDocument } from "@/lib/types";
import { DOC_HEADERS } from "@/lib/docTemplates";
import { longDate } from "@/lib/format";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

/**
 * A document facsimile.
 *
 * Rather than showing a placeholder image, the sheet is drawn from the same
 * extraction data that the highlight coordinates come from. Two consequences
 * worth having: the highlight can never drift out of alignment with the value
 * it points at, and the "document" is legible enough that a reviewer can
 * actually read the box they are being sent to — which is the entire point of
 * the side-by-side.
 */
export function DocumentSheet({
  doc,
  page,
  highlightRegionIds,
  primaryRegionId,
  onPageChange,
  scale = "fit",
}: {
  doc: TaxDocument;
  page: number;
  highlightRegionIds?: string[];
  primaryRegionId?: string;
  onPageChange?: (page: number) => void;
  scale?: "fit" | "compact";
}) {
  const current = doc.pages.find((p) => p.number === page) ?? doc.pages[0];
  const header = DOC_HEADERS[doc.kind];
  const primaryRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(0);

  // Re-run the attention pulse whenever the target changes, so following a
  // second piece of evidence on the same page is still visibly a new target.
  useEffect(() => {
    setFlash((f) => f + 1);
  }, [primaryRegionId, page]);

  useEffect(() => {
    primaryRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [primaryRegionId, page]);

  const highlights = new Set(highlightRegionIds ?? []);

  return (
    <div className="flex flex-col">
      <div className="doc-sheet w-full overflow-hidden rounded-sm">
        {/* ---- Printed header --------------------------------------- */}
        <div className="absolute inset-x-0 top-0 px-[6%] pt-[3.5%]">
          <div className="flex items-start justify-between border-b-2 border-ink-800 pb-[2%]">
            <div>
              <div className="text-[13px] font-bold leading-tight text-ink-900">
                {header.title}
              </div>
              <div className="text-[10px] leading-tight text-ink-600">{header.subtitle}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-ink-800">{doc.taxYear}</div>
              {header.omb && <div className="text-[8px] text-ink-500">{header.omb}</div>}
            </div>
          </div>
          <div className="mt-[1%] flex justify-between text-[8px] text-ink-500">
            <span>{doc.issuer}</span>
            <span>
              Page {current.number} of {doc.pages.length}
            </span>
          </div>
        </div>

        {/* ---- Extracted regions, drawn as form boxes --------------- */}
        {current.regions.map((r) => {
          const isPrimary = r.id === primaryRegionId;
          const isSecondary = !isPrimary && highlights.has(r.id);
          return (
            <div
              key={r.id}
              ref={isPrimary ? primaryRef : undefined}
              className="absolute border border-ink-300 bg-white/60 px-[0.8%] py-[0.4%]"
              style={{
                left: `${r.box.x}%`,
                top: `${r.box.y}%`,
                width: `${r.box.w}%`,
                height: `${r.box.h}%`,
              }}
            >
              <div className="flex items-baseline gap-1 truncate text-[7.5px] leading-tight text-ink-500">
                {r.boxLabel && <span className="font-semibold text-ink-700">{r.boxLabel}</span>}
                <span className="truncate">{r.label}</span>
              </div>
              <div
                className={`truncate font-mono text-[10.5px] leading-tight ${
                  isPrimary ? "font-bold text-ai-700" : "text-ink-900"
                }`}
              >
                {r.value}
              </div>
            </div>
          );
        })}

        {/* ---- Highlight overlay ------------------------------------ */}
        {current.regions
          .filter((r) => highlights.has(r.id) || r.id === primaryRegionId)
          .map((r) => (
            <div
              key={`hl-${r.id}-${flash}`}
              className={
                r.id === primaryRegionId
                  ? "doc-highlight animate-pulse-ring"
                  : "doc-highlight-secondary"
              }
              style={{
                left: `${r.box.x - 0.6}%`,
                top: `${r.box.y - 0.6}%`,
                width: `${r.box.w + 1.2}%`,
                height: `${r.box.h + 1.2}%`,
              }}
            />
          ))}

        {/* ---- Printed footer --------------------------------------- */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-[6%] pb-[2.5%] text-[7.5px] text-ink-400">
          <span>
            {doc.kind} · {doc.id}
          </span>
          <span>Received {longDate(doc.receivedAt)} · {doc.source}</span>
        </div>
      </div>

      {doc.pages.length > 1 && onPageChange && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            className="btn-ghost px-2 py-1"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <IconChevronLeft size={13} />
          </button>
          <span className="tabular text-2xs text-ink-500">
            Page {page} of {doc.pages.length}
          </span>
          <button
            className="btn-ghost px-2 py-1"
            disabled={page >= doc.pages.length}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <IconChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
