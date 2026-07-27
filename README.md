# Tessera — AI tax platform prototype

A working prototype for the AI Engineer case study. It covers five of the ten
challenges as one coherent product rather than five separate demos:

| # | Challenge | Where to see it |
|---|---|---|
| 07 | An Actionable Dashboard | `/dashboard` |
| 01 | Source Document Traceability | `/returns/[id]` — click any value |
| 10 | Trustworthy AI | the inspector panel on the right of a return |
| 08 | Clickable vs. Editable | everywhere; documented at `/system` |
| 09 | Complexity Made Navigable | `/documents` — 2,535 documents |

They are bundled deliberately. A dashboard that ranks work is only credible if
you can open a return and check the reasoning; traceability is only useful if
there is an affordance system telling you what has been verified. Built
separately they would be five screens. Built together they are one workflow:
**dashboard → return → field → source document → AI reasoning → correction.**

## Running it

```bash
npm install && npm run dev
```

Then open http://localhost:3000.

## Suggested walkthrough

1. **`/dashboard`** — the queue is ranked by real scoring logic. Click *Why #1*
   on any row to see the score decomposed into its components.
2. Switch role bottom-left to **Firm Manager** — the same dashboard becomes
   bottlenecks and capacity instead of a personal queue.
3. **Open a return** with a conflict. `/system` lists three at the bottom under
   *See it under pressure*, or use the *Conflicts* filter on the dashboard.
4. **Click the charity line.** The inspector shows the AI's reading, the source
   receipt with the exact amount highlighted, the derivation chain including the
   duplicate it excluded, and two competing readings to choose between.
5. **Accept, or correct it.** Corrections happen in the panel — nothing
   navigates, and the original extraction is kept and reversible.
6. **`/documents`** — 2,535 documents with faceting, grouping and search.

---

## What is real vs. simulated

### Genuinely working

- **Prioritisation** (`src/lib/priority.ts`) — every return is scored by the same
  function. The dashboard ranking, the filter counts, the bottleneck chart and
  the capacity view are all computed from it. Nothing is hand-ordered.
- **Traceability graph** — return fields reference document IDs and region IDs;
  the highlight coordinates come from the same records that render the document.
  Following a number to its box is a real lookup, not a scripted animation.
- **The affordance system** (`src/components/affordance/states.tsx`) — one table
  drives every field's colour, border, icon, cursor and whether it opens a
  review. Adding a state means adding a row.
- **Review state** — accept / correct / flag / revert mutate a real reducer.
  Counters, section badges, the change log and the affordance styling all
  respond. State is in memory and resets on reload.
- **Search, faceting, grouping, progressive disclosure** on the document library,
  running against the full 2,535-document set.
- **Derivation chains** — the arithmetic shown is the arithmetic used. The
  student-loan cap, the SALT cap and the $3,000 capital-loss limit are applied
  in the data layer and rendered from the same steps.

### Simulated

- **All data is fabricated**, generated at module load from a fixed seed
  (`src/lib/data.ts`). 245 clients, 240 returns, 2,535 documents, ~2,800 fields.
  Deterministic on purpose: `Math.random()` or `Date.now()` in the generator
  would produce different markup on server and client and break hydration.
  "Today" is pinned to 23 July 2026.
- **No OCR, no parsing, no model.** Confidence scores, verdicts, evidence links
  and uncertainty text are authored fixtures shaped like a real extraction
  pipeline's output. `AiAssessment` in `src/lib/types.ts` is the contract a real
  service would have to satisfy.
- **Documents are drawn, not scanned.** Each "scan" is rendered from its own
  extraction data. This is why the highlight can never drift out of alignment
  with the value it points at — there is no second copy of the coordinates.
- **No backend, no auth, no persistence.** The role switcher changes what the
  product shows; it does not enforce anything.
- **Edge cases are seeded on a rotation**, not drawn at random — conflicts,
  missing sources and anomalies each land on a fixed fraction of returns, so
  every state is findable by someone clicking around rather than being a lottery.

---

## Design decisions worth explaining

**Blue means interactive, violet means machine-generated. They never overlap.**
Most products use their brand colour for both, and the accent stops meaning
anything. Keeping the channels separate lets someone glance at a return and see
how much of it a machine touched without reading a word. This one rule
determines most of the rest of the visual language.

**Confidence is shown as a band, not a percentage.** A reviewer cannot behave
differently at 87% than at 84%, so a headline number invites false precision.
Three bands map to three genuinely different behaviours — spot-check, open the
source, verify line by line. The exact figure stays available on hover.

**The inspector answers four questions in a fixed order:** what is this and how
sure is the machine → which document and where on it → what was done to it →
what should I do. Transparency that opens with a derivation tree is transparency
nobody reads. Opening with one plain sentence and letting people descend as far
as they want is the version that gets used.

**Uncertainty is stated, not implied by a low score.** Where the model can't
determine something, it says so in words: a supplemental K-1 statement that
wasn't attached, a noncovered lot whose basis the broker never reported, a
mortgage above the $750k limit whose origination date decides the answer. A
number saying 71% doesn't tell a reviewer where to look; a sentence does.

**Corrections never move you.** Changing a value happens inside the panel you're
already in, the original extraction is preserved, and undo is one click. If
disagreeing with the AI costs you your place, people stop disagreeing with it —
and then the confidence scores are decoration.

**The dashboard shows its reasoning.** Every row can be expanded into the
components of its score. A ranking you can't argue with on specific grounds is
one people route around, and they go back to the spreadsheet.

**Fee tier is a tiebreak, never a driver.** Strategic and Premium clients
contribute 4 and 2 points against a possible ~150. If revenue ranked the work,
the dashboard would quietly become a sales tool and preparers would learn to
distrust it.

**Locked fields always say why.** Grey with no explanation is how software
teaches people to stop reading.

**Colour is never the only signal.** Each state also carries its own border
treatment — solid, dashed, hatched, none — and its own icon, so the system
survives greyscale and colour vision deficiency. The dashed border on an AI
value does real work: a solid box would read as settled, and it isn't yet.

---

## Structure

```
src/
  lib/
    data.ts          the generator — all fabricated data originates here
    types.ts         domain contracts, incl. the shape a real AI service would return
    priority.ts      scoring, bottlenecks, capacity — real logic
    docTemplates.ts  page geometry for the document facsimiles
    rng.ts           seeded PRNG (hydration-safe determinism)
  components/
    affordance/      the interaction-state system (Challenge 08)
    trace/           document sheet + inspector (Challenges 01, 10)
    store.tsx        session state; the seam where an API would attach
  app/
    dashboard/       Challenge 07
    returns/[id]/    Challenges 01, 10
    documents/       Challenge 09
    system/          the interaction system, documented
```

## Known limits

- Review state is in memory; a reload resets it.
- The role switcher is a presentation concern only — no real permissions.
- Client-side rendering throughout. At this data volume it is comfortable, but a
  real build would paginate server-side rather than slice in the browser.
- Five of ten challenges. The client-facing set (onboarding, collaboration,
  status for non-experts) is not built.
