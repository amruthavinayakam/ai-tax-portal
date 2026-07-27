/**
 * Domain types for the prototype.
 *
 * Everything here is fabricated at module load from a fixed seed — see
 * `data.ts`. The shapes are modelled on what a real extraction pipeline would
 * plausibly emit so the UI is built against a realistic contract rather than
 * against whatever was convenient to fake.
 */

export type RoleId = "preparer" | "reviewer" | "manager";

export interface Role {
  id: RoleId;
  name: string;
  title: string;
  initials: string;
  /** Short description of what this role is accountable for. */
  scope: string;
}

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

export type DocKind =
  | "W-2"
  | "1099-INT"
  | "1099-DIV"
  | "1099-NEC"
  | "1099-B"
  | "1098"
  | "1098-E"
  | "K-1"
  | "Charitable Receipt"
  | "Property Tax Statement"
  | "Bank Statement"
  | "Prior Year Return";

/** A rectangle on a page, in percentages of page width/height. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A labelled region the (simulated) extractor found on a page. The document
 * viewer renders these directly — the "scan" is drawn from its own extraction
 * data, which keeps highlight coordinates and rendered content in sync by
 * construction.
 */
export interface Region {
  id: string;
  /** Form box number where the source document has one, e.g. "Box 1". */
  boxLabel?: string;
  label: string;
  value: string;
  box: Box;
  /** Column position used by the facsimile renderer. */
  col: 0 | 1;
  row: number;
  span?: 1 | 2;
}

export interface DocPage {
  number: number;
  regions: Region[];
}

export interface TaxDocument {
  id: string;
  clientId: string;
  returnId: string;
  kind: DocKind;
  /** Issuer / payer / institution. */
  issuer: string;
  taxYear: number;
  /** ISO date, from a fixed clock. */
  receivedAt: string;
  source: "Client upload" | "Bank connection" | "Firm scan" | "Prior year carryforward";
  pages: DocPage[];
  /** Overall extraction health for the doc, 0..1. */
  extractionQuality: number;
  /** Set when the doc is a duplicate of another. */
  duplicateOf?: string;
  status: "Extracted" | "Needs review" | "Superseded" | "Unreadable";
  sizeKb: number;
}

/* ------------------------------------------------------------------ *
 * AI output
 * ------------------------------------------------------------------ */

export interface EvidenceItem {
  documentId: string;
  page: number;
  regionId: string;
  /** Why this region was taken as support. */
  note: string;
}

/**
 * One step in the chain from raw source values to the number on the return.
 * Rendered as a visible derivation so a reviewer never has to trust a total.
 */
export interface TransformStep {
  label: string;
  detail: string;
  amount?: number;
  kind: "source" | "sum" | "adjust" | "limit" | "result";
}

export type AiVerdict =
  /** Single clean source, extractor is confident. */
  | "extracted"
  /** Derived from more than one source by an explainable rule. */
  | "derived"
  /** Two sources disagree; a person has to pick. */
  | "conflict"
  /** Expected a document that never arrived. */
  | "missing-source"
  /** Value is fine but sits outside the client's normal range. */
  | "anomaly";

export interface AiAssessment {
  verdict: AiVerdict;
  /** 0..1. Presented in bands, never as a bare number. See ConfidenceMeter. */
  confidence: number;
  /** One sentence, plain language, no jargon. Shown before anything else. */
  summary: string;
  /** What the model actually did, as steps. */
  transform: TransformStep[];
  evidence: EvidenceItem[];
  /** Honest statement of what the model could not determine. */
  uncertainty?: string;
  /** The concrete next action being recommended to the human. */
  recommendation: string;
  /** Populated for conflicts: the competing candidate values. */
  alternatives?: { value: number; documentId: string; note: string }[];
}

/* ------------------------------------------------------------------ *
 * Return fields
 * ------------------------------------------------------------------ */

/**
 * The interaction state of a field. This enum *is* the affordance system —
 * every field on every screen renders from exactly one of these, which is what
 * keeps the visual language consistent across the app.
 */
export type FieldState =
  /** Human types the value. Nothing has claimed it yet. */
  | "editable"
  /** AI proposed a value; no human has confirmed it. */
  | "ai-unverified"
  /** A human looked at the AI value and accepted it. */
  | "verified"
  /** AI wants a decision before this can move on. */
  | "needs-approval"
  /** Computed by the return itself. Not typeable, but traceable. */
  | "calculated"
  /** Cannot change here, and the field says why. */
  | "locked";

export interface ReturnField {
  id: string;
  returnId: string;
  /** Form + line, e.g. "Form 1040 · Line 1a". */
  form: string;
  line: string;
  label: string;
  value: number;
  state: FieldState;
  /** Present whenever a machine touched the field. */
  ai?: AiAssessment;
  /** Explains a `locked` state in the UI. Required when state is locked. */
  lockReason?: string;
  /** Grouping in the return outline. */
  section: SectionId;
  /** Prior-year comparison, drives the anomaly signal. */
  priorYear?: number;
}

export type SectionId =
  | "income"
  | "adjustments"
  | "deductions"
  | "credits"
  | "payments"
  | "summary";

export interface Section {
  id: SectionId;
  name: string;
  description: string;
}

/* ------------------------------------------------------------------ *
 * Returns, clients, work
 * ------------------------------------------------------------------ */

export type ReturnStage =
  | "Intake"
  | "Docs pending"
  | "Extraction review"
  | "Preparation"
  | "Manager review"
  | "Client signature"
  | "Filed";

export interface Client {
  id: string;
  name: string;
  kind: "Individual" | "Business";
  entity?: string;
  since: number;
  /** Fee tier, used by prioritisation as a tiebreak, not a primary signal. */
  tier: "Standard" | "Premium" | "Strategic";
}

export interface OpenItem {
  id: string;
  returnId: string;
  label: string;
  owner: "Firm" | "Client";
  kind: "Missing document" | "Open question" | "Conflict" | "Signature";
  ageDays: number;
}

export interface TaxReturn {
  id: string;
  clientId: string;
  taxYear: number;
  form: "1040" | "1120-S" | "1065";
  stage: ReturnStage;
  assignedTo: RoleId;
  /** ISO date. */
  dueDate: string;
  extended: boolean;
  /** 0..1 progress through the stages. Derived, not stored by hand. */
  docCount: number;
  /** Number of AI items still awaiting a human decision. */
  unresolvedAiCount: number;
  openItems: OpenItem[];
  /** Minutes of work logged, used for manager capacity view. */
  minutesLogged: number;
  refundOrDue: number;
  lastActivityDays: number;
}

/* ------------------------------------------------------------------ *
 * Prioritisation
 * ------------------------------------------------------------------ */

export interface PriorityReason {
  label: string;
  points: number;
  tone: "stop" | "warn" | "ai" | "ink";
}

export interface RankedReturn {
  ret: TaxReturn;
  client: Client;
  score: number;
  reasons: PriorityReason[];
  /** The single action the dashboard is telling you to take. */
  nextAction: string;
  daysToDue: number;
}
