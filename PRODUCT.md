# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tessera is one platform serving two sides of tax work, designed CPA-first.

**Primary — the firm.** Tax professionals inside a CPA practice, split by responsibility:
- **Preparers** own a personal queue of returns and take each through preparation.
- **Reviewers** sign off returns and clear escalated AI conflicts.
- **Managers** watch the whole book: capacity, deadlines, and where work is stuck.

**Also served — the client side.** The people the firm files for:
- **Individual taxpayers** and **business owners** who upload source documents, answer questions, and sign.

The case study frames the full product as **six roles** — individual taxpayers, business owners, tax preparers, reviewers, firm administrators, and seasonal staff — including the edge case of a firm employee who also has a personal return in the system. The firm-facing preparer/reviewer/manager roles are the anchor; the client experience is a first-class but currently unbuilt half of the same product.

The central situation: it is tax season, a return has dozens to hundreds of source documents behind it, an AI has extracted values from them, and a human is legally accountable for every number — so they must be able to verify the machine's work quickly rather than re-derive it by hand.

## Product Purpose

Tessera is an AI-powered tax platform built from scratch — no legacy app, no existing codebase. It unifies the fragmented reality of tax preparation (documents, extracted values, questions, deadlines, sign-off) into one product where AI does the mechanical extraction and humans stay in control of the result.

Success is a CPA trusting the software enough to work *through* it instead of around it in a spreadsheet — because every number is traceable, every AI decision is legible, and correcting the machine is faster than doubting it.

## Positioning

The mechanism a neighboring product could not truthfully copy: **every machine-produced number carries its own evidence.** Click any value on a return and see the exact source document, the exact box on the page, and the full derivation from source to figure — including anything the AI excluded or capped. Trust is earned through visible provenance, banded confidence tied to a recommended action, and honestly-stated uncertainty — not through a black box asking to be believed.

Alongside it, a strict affordance system makes provenance and editability legible at a glance: a user can tell, without reading, what a machine produced, what a human verified, what needs a decision, and what cannot be changed.

## Operating Context

- **The return lifecycle:** returns move through a fixed pipeline — Intake → Docs pending → Extraction review → Preparation → Manager review → Client signature → Filed. Status must read the same way to a client and to firm staff.
- **Source documents** are the raw proof behind every number: W-2s (wages), 1099s (interest, dividends, brokerage, contractor income), 1098s (mortgage and student-loan interest), K-1s (partnership income), charitable receipts, property-tax statements, and prior-year returns. A single return commonly involves dozens; the library spans the whole firm's intake.
- **The work is deadline-driven and blocked-on-others:** much of a preparer's day is waiting on clients for missing documents or signatures, and resolving cases where two documents disagree.
- **Deliverable context:** this project is also a job-application case study — a hosted, clickable prototype plus a walkthrough video and a README distinguishing what is real from what is simulated. This context must not leak into the product's own voice or content.

## Capabilities and Constraints

**Built today (the first slice — five challenges):**
- **Source-document traceability (01):** field → extracted value → source document → exact page region → derivation chain.
- **Actionable dashboard (07):** a queue ranked by real scoring logic, with the reasons for each ranking exposed; separate preparer and manager views.
- **Clickable vs. editable (08):** a single affordance system covering editable / AI-extracted / verified / needs-decision / calculated / locked, applied on every screen and documented on its own reference page.
- **Complexity at scale (09):** a firm-wide document library (~2,500 documents) with search, faceting, grouping, and progressive disclosure.
- **Trustworthy AI (10):** confidence bands, evidence, stated uncertainty, recommended action, and an in-place accept / correct / flag / revert flow that never loses the user's place.
- A light/dark theme across the whole product.

**Explicitly undecided / unbuilt (future scope):**
- **Client & CPA collaboration (02):** contextual messaging tied to documents/issues, internal-vs-client visibility, request tracking.
- **First-run client experience (03):** onboarding a brand-new taxpayer to their next action within seconds.
- **Cross-object navigation (04):** moving between message → document → questionnaire → task without losing context.
- **Role-aware architecture (05):** the full six-role model, permission communication, and multi-role context switching (only preparer/reviewer/manager are built).
- **Client-facing status (06):** the shared status model rendered for a non-expert audience.

**Technical constraints:**
- Next.js (App Router) + Tailwind, deployed as a static-friendly web app.
- **Everything behind the interface is simulated.** No OCR, no document parsing, no AI model, no backend, no auth, no persistence. All data is fabricated at module load from a fixed seed; "today" is pinned to 23 July 2026 for reproducibility. Session decisions live in memory and reset on reload.

**Terminology (product-specific):** *return* (the filing), *field/line* (one number on the return), *source document* (the proof behind it), *extraction* (a machine reading a value), *verdict* (what the AI concluded: extracted / derived / conflict / missing-source / anomaly), *confidence band*, *open item* (something owed by the firm or the client).

## Brand Commitments

- **Name: "Tessera" is binding.** Future work preserves it. (A tessera is one tile in a mosaic — the many small, verifiable pieces that compose a whole return.)
- **"Gray & Grove CPA" is sample data, not a brand commitment** — the firm name is placeholder content and may change freely.
- **Voice (established by the current build):** plain-language over jargon, honest about uncertainty, and precise. The product never shows false precision (confidence is a band with a recommended action, not a bare percentage), always states *why* something is locked or flagged, and explains AI output in words a non-expert could read.

## Evidence on Hand

- **The case-study brief:** `C:\Users\vamru\Downloads\AI_Engineer_Case_Study_Updated.pdf` — the ten challenges and the "real vs. simulated" mandate.
- **`README.md`** — records exactly what is genuinely wired up versus simulated, and the design rationale.
- **No real users, clients, returns, documents, testimonials, benchmarks, or firm exist.** Every name, number, and document in the product is fabricated and must never be presented as real data, a real customer, or a real filing.

## Product Principles

1. **AI proposes, a human disposes.** No machine value is silently authoritative; every one is reviewable, correctable, and reversible, and the original extraction is always kept.
2. **A number you can't trace is a number you can't trust.** Provenance — source document, exact location, and full derivation — is a non-negotiable property of every value, not a feature bolted on later.
3. **Confidence must drive behavior, not decorate.** Uncertainty is expressed as a recommended action and stated in words, because a raw score tells a reviewer nothing about what to *do*.
4. **One product across six roles, not six products.** The same shell adapts to each role without splintering; status and structure mean the same thing to everyone, shown at the depth each audience needs.
5. **Legibility outranks density.** Deep professional work stays approachable through progressive disclosure — the complexity is made navigable, never hidden and never dumped all at once.

## Accessibility & Inclusion

- The product must be **learnable without training** — it serves occasional and seasonal staff and non-expert clients who have no muscle memory for it.
- **Color is never the sole carrier of meaning.** Every interaction state also carries a distinct border treatment and icon, so the affordance system survives greyscale and color-vision deficiency.
- Non-expert audiences (clients) must be shown appropriate detail without exposure to unnecessary internal complexity.
