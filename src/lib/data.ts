/**
 * The entire dataset. Fabricated, deterministic, generated once at module load.
 *
 * Nothing here talks to a server, and nothing here is real. The point is to give
 * the interface a dataset with enough volume and enough awkward edge cases that
 * the design has something to prove itself against — conflicts, missing
 * sources, anomalies, duplicates, low-confidence extractions and locked fields
 * all exist in quantity, not as a single scripted demo row.
 */

import { Rand } from "./rng";
import { TODAY, addDays, isoDate, daysBetween, money } from "./format";
import { layoutRegions, type RegionSpec } from "./docTemplates";
import type {
  AiAssessment,
  Client,
  DocKind,
  DocPage,
  OpenItem,
  Region,
  ReturnField,
  ReturnStage,
  Role,
  RoleId,
  Section,
  SectionId,
  TaxDocument,
  TaxReturn,
  TransformStep,
} from "./types";

/* ------------------------------------------------------------------ *
 * Static reference data
 * ------------------------------------------------------------------ */

export const ROLES: Role[] = [
  {
    id: "preparer",
    name: "Dana Whitfield",
    title: "Senior Tax Preparer",
    initials: "DW",
    scope: "Owns a personal queue of returns through preparation.",
  },
  {
    id: "reviewer",
    name: "Marcus Ilori",
    title: "Review Manager",
    initials: "MI",
    scope: "Signs off returns and clears escalated AI conflicts.",
  },
  {
    id: "manager",
    name: "Priya Raghunathan",
    title: "Firm Manager",
    initials: "PR",
    scope: "Watches the whole book: capacity, deadlines, bottlenecks.",
  },
];

export const SECTIONS: Section[] = [
  { id: "income", name: "Income", description: "Everything reported as received during the year." },
  { id: "adjustments", name: "Adjustments", description: "Above-the-line reductions to gross income." },
  { id: "deductions", name: "Deductions", description: "Standard or itemized, whichever is claimed." },
  { id: "credits", name: "Credits", description: "Dollar-for-dollar reductions to tax owed." },
  { id: "payments", name: "Payments", description: "Amounts already paid toward this year's tax." },
  { id: "summary", name: "Summary", description: "Computed totals and the final result." },
];

export const STAGES: ReturnStage[] = [
  "Intake",
  "Docs pending",
  "Extraction review",
  "Preparation",
  "Manager review",
  "Client signature",
  "Filed",
];

const FIRST = [
  "Alan", "Beatriz", "Cormac", "Dahlia", "Elena", "Farid", "Greta", "Hollis",
  "Imani", "Jonah", "Kiara", "Lucian", "Mira", "Nadia", "Omar", "Paloma",
  "Quentin", "Rosa", "Soren", "Tessa", "Ulises", "Vera", "Wyatt", "Ximena",
  "Yusuf", "Zoe", "Adaeze", "Bo", "Clement", "Delphine", "Ezra", "Fiona",
  "Gideon", "Halima", "Ignatius", "Juno", "Kestrel", "Linnea", "Malik", "Noor",
];

const LAST = [
  "Abernathy", "Baptiste", "Castellanos", "Dunmore", "Eriksen", "Fairbanks",
  "Goswami", "Hollingsworth", "Ibarra", "Jorgensen", "Kowalczyk", "Lindqvist",
  "Marchetti", "Nakashima", "Oyelaran", "Pemberton", "Quintanilla", "Rousseau",
  "Sandoval", "Thackeray", "Ueda", "Villalobos", "Wexler", "Yamamoto",
  "Zabala", "Ashworth", "Beaumont", "Calderon", "Dellinger", "Estrada",
];

const BIZ_PREFIX = [
  "Northgate", "Silverbrook", "Harborline", "Cedar Fork", "Ironwood",
  "Bright Meridian", "Quarry Lane", "Blue Heron", "Stonewell", "Kestrel Point",
  "Ravensdale", "Coppermill", "Fieldstone", "Alder & Vane", "Longwater",
];

const BIZ_SUFFIX = [
  "Dental Group", "Logistics", "Design Studio", "Contracting", "Veterinary",
  "Consulting", "Brewing Co.", "Orthopedics", "Property Group", "Analytics",
  "Landscaping", "Medical Partners", "Outfitters", "Fabrication",
];

const EMPLOYERS = [
  "Halcyon Systems Inc.", "Rivermark Health", "Perch Analytics LLC",
  "Cobalt Bay Foods", "Trellis Education Group", "Northwind Freight",
  "Sablefish Media", "Grayling Robotics", "Vantage Point Legal",
  "Bramblewood Schools", "Orion Fabrication", "Kite & Compass Retail",
];

const BANKS = [
  "First Meridian Bank", "Cascade Credit Union", "Anchor Savings",
  "Belmont Financial", "Harborstone Bank", "Sequoia Trust",
];

const BROKERS = [
  "Larkspur Securities", "Ridgeline Investments", "Tidewater Brokerage",
  "Foxglove Capital", "Meridian Wealth",
];

const LENDERS = [
  "Homestead Mortgage Co.", "Pinnacle Home Loans", "Basswood Lending",
  "Coastal Federal Mortgage",
];

const SERVICERS = ["EduServ Loan Servicing", "Granite Student Aid", "Northstar Servicing"];

const CHARITIES = [
  "Riverside Food Bank", "Cascade Wildlife Trust", "Harbor Youth Alliance",
  "Meridian Public Radio", "Stonebridge Animal Rescue", "Open Doors Literacy",
];

const PARTNERSHIPS = [
  "Willow Creek Partners LP", "Sixth Street Holdings LLC",
  "Blackthorn Ventures LP", "Kingsley Real Estate LLC",
];

const COUNTIES = ["Marion County", "Whitcomb County", "Ellery County", "Danforth County"];

const TAX_YEAR = 2025;

/* ------------------------------------------------------------------ *
 * Document construction
 * ------------------------------------------------------------------ */

/** Semantic amounts a generated document exposes to the return builder. */
interface DocAmounts {
  [key: string]: number;
}

interface BuiltDoc {
  doc: TaxDocument;
  amounts: DocAmounts;
  /** Maps a semantic key to the region that displays it. */
  regionFor: Record<string, string>;
}

function paginate(regions: Region[]): DocPage[] {
  // Every generated document fits one page except the prior-year return, which
  // is deliberately long so the viewer's page navigation is exercised.
  const byPage = new Map<number, Region[]>();
  for (const r of regions) {
    const page = Math.floor(r.row / 7) + 1;
    if (!byPage.has(page)) byPage.set(page, []);
    // Re-base the row so each page starts at the top of its own sheet.
    byPage.get(page)!.push({
      ...r,
      row: r.row % 7,
      box: { ...r.box, y: r.box.y - Math.floor(r.row / 7) * 7 * 9.7 },
    });
  }
  return [...byPage.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, regions]) => ({ number, regions }));
}

function buildDoc(
  id: string,
  clientId: string,
  returnId: string,
  kind: DocKind,
  issuer: string,
  specs: RegionSpec[],
  amounts: DocAmounts,
  amountKeyByIndex: Record<number, string>,
  rand: Rand,
): BuiltDoc {
  const regions = layoutRegions(id, specs);
  const regionFor: Record<string, string> = {};
  for (const [idx, key] of Object.entries(amountKeyByIndex)) {
    regionFor[key] = regions[Number(idx)].id;
  }

  const quality = rand.weighted([
    [rand.float(0.94, 0.995), 6],
    [rand.float(0.82, 0.93), 3],
    [rand.float(0.55, 0.78), 1],
  ]);

  return {
    doc: {
      id,
      clientId,
      returnId,
      kind,
      issuer,
      taxYear: TAX_YEAR,
      receivedAt: isoDate(addDays(TODAY, -rand.int(4, 180))),
      source: rand.weighted([
        ["Client upload" as const, 6],
        ["Firm scan" as const, 2],
        ["Bank connection" as const, 2],
        ["Prior year carryforward" as const, 1],
      ]),
      pages: paginate(regions),
      extractionQuality: quality,
      status: quality < 0.8 ? "Needs review" : "Extracted",
      sizeKb: rand.int(120, 3800),
    },
    amounts,
    regionFor,
  };
}

const m = (n: number) => `$${Math.round(n).toLocaleString("en-US")}.00`;

function ein(rand: Rand) {
  return `${rand.int(10, 99)}-${String(rand.int(1000000, 9999999)).padStart(7, "0")}`;
}

function makeW2(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const employer = rand.pick(EMPLOYERS);
  const wages = rand.money(38_000, 210_000, 137);
  const fedTax = Math.round(wages * rand.float(0.11, 0.19));
  const ssWages = Math.min(wages, 176_100);
  const retirement = rand.chance(0.7) ? rand.money(2_000, 23_000, 250) : 0;

  const specs: RegionSpec[] = [
    { label: "Employer name, address, and ZIP code", value: employer, span: 2 },
    { boxLabel: "Box b", label: "Employer identification number (EIN)", value: ein(rand) },
    { boxLabel: "Box 1", label: "Wages, tips, other compensation", value: m(wages) },
    { boxLabel: "Box 2", label: "Federal income tax withheld", value: m(fedTax) },
    { boxLabel: "Box 3", label: "Social security wages", value: m(ssWages) },
    { boxLabel: "Box 4", label: "Social security tax withheld", value: m(ssWages * 0.062) },
    { boxLabel: "Box 5", label: "Medicare wages and tips", value: m(wages) },
    { boxLabel: "Box 6", label: "Medicare tax withheld", value: m(wages * 0.0145) },
    { boxLabel: "Box 12a", label: "Code D — elective deferrals to 401(k)", value: m(retirement) },
    { boxLabel: "Box 17", label: "State income tax", value: m(wages * rand.float(0.03, 0.06)) },
  ];

  return buildDoc(
    id, clientId, returnId, "W-2", employer, specs,
    { wages, fedTax, retirement },
    { 3: "wages", 4: "fedTax", 9: "retirement" },
    rand,
  );
}

function make1099Int(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const payer = rand.pick(BANKS);
  const interest = rand.money(40, 6_400, 7);
  const exempt = rand.chance(0.25) ? rand.money(100, 2_200, 11) : 0;

  const specs: RegionSpec[] = [
    { label: "Payer's name, address, and ZIP code", value: payer, span: 2 },
    { boxLabel: "Box 1", label: "Interest income", value: m(interest) },
    { boxLabel: "Box 4", label: "Federal income tax withheld", value: m(0) },
    { boxLabel: "Box 8", label: "Tax-exempt interest", value: m(exempt) },
    { label: "Account number", value: `••••${rand.int(1000, 9999)}` },
  ];

  return buildDoc(
    id, clientId, returnId, "1099-INT", payer, specs,
    { interest, exempt },
    { 1: "interest", 3: "exempt" },
    rand,
  );
}

function make1099Div(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const payer = rand.pick(BROKERS);
  const ordinary = rand.money(200, 14_000, 13);
  const qualified = Math.round(ordinary * rand.float(0.55, 0.95));
  const capGain = rand.chance(0.5) ? rand.money(100, 5_000, 17) : 0;

  const specs: RegionSpec[] = [
    { label: "Payer's name, address, and ZIP code", value: payer, span: 2 },
    { boxLabel: "Box 1a", label: "Total ordinary dividends", value: m(ordinary) },
    { boxLabel: "Box 1b", label: "Qualified dividends", value: m(qualified) },
    { boxLabel: "Box 2a", label: "Total capital gain distributions", value: m(capGain) },
    { boxLabel: "Box 4", label: "Federal income tax withheld", value: m(0) },
  ];

  return buildDoc(
    id, clientId, returnId, "1099-DIV", payer, specs,
    { ordinary, qualified, capGain },
    { 1: "ordinary", 2: "qualified", 3: "capGain" },
    rand,
  );
}

function make1099Nec(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const payer = rand.pick(EMPLOYERS);
  const comp = rand.money(1_500, 78_000, 53);

  const specs: RegionSpec[] = [
    { label: "Payer's name, address, and ZIP code", value: payer, span: 2 },
    { boxLabel: "Box 1", label: "Nonemployee compensation", value: m(comp) },
    { boxLabel: "Box 4", label: "Federal income tax withheld", value: m(0) },
  ];

  return buildDoc(id, clientId, returnId, "1099-NEC", payer, specs, { comp }, { 1: "comp" }, rand);
}

function make1099B(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const broker = rand.pick(BROKERS);
  const proceeds = rand.money(4_000, 190_000, 91);
  const basis = Math.round(proceeds * rand.float(0.6, 1.25));
  const shortTerm = Math.round((proceeds - basis) * rand.float(0.1, 0.45));
  const longTerm = proceeds - basis - shortTerm;

  const specs: RegionSpec[] = [
    { label: "Broker or barter exchange", value: broker, span: 2 },
    { boxLabel: "Box 1d", label: "Proceeds", value: m(proceeds) },
    { boxLabel: "Box 1e", label: "Cost or other basis", value: m(basis) },
    { label: "Short-term gain / (loss)", value: m(shortTerm) },
    { label: "Long-term gain / (loss)", value: m(longTerm) },
    { label: "Covered / noncovered", value: rand.chance(0.8) ? "Covered" : "Noncovered" },
  ];

  return buildDoc(
    id, clientId, returnId, "1099-B", broker, specs,
    { proceeds, basis, shortTerm, longTerm, net: shortTerm + longTerm },
    { 1: "proceeds", 2: "basis", 3: "shortTerm", 4: "longTerm" },
    rand,
  );
}

function make1098(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const lender = rand.pick(LENDERS);
  const interest = rand.money(3_800, 31_000, 23);
  const principal = rand.money(180_000, 920_000, 1000);

  const specs: RegionSpec[] = [
    { label: "Recipient's / lender's name and address", value: lender, span: 2 },
    { boxLabel: "Box 1", label: "Mortgage interest received from payer", value: m(interest) },
    { boxLabel: "Box 2", label: "Outstanding mortgage principal", value: m(principal) },
    { boxLabel: "Box 5", label: "Mortgage insurance premiums", value: m(0) },
    { boxLabel: "Box 6", label: "Points paid on purchase of principal residence", value: m(0) },
  ];

  return buildDoc(
    id, clientId, returnId, "1098", lender, specs,
    { interest, principal },
    { 1: "interest", 2: "principal" },
    rand,
  );
}

function make1098E(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const servicer = rand.pick(SERVICERS);
  // Deliberately often above the $2,500 cap so the limit step in the
  // derivation chain has something to actually do.
  const interest = rand.money(900, 4_300, 7);

  const specs: RegionSpec[] = [
    { label: "Recipient's / lender's name and address", value: servicer, span: 2 },
    { boxLabel: "Box 1", label: "Student loan interest received by lender", value: m(interest) },
    { label: "Borrower's account number", value: `••••${rand.int(1000, 9999)}` },
  ];

  return buildDoc(id, clientId, returnId, "1098-E", servicer, specs, { interest }, { 1: "interest" }, rand);
}

function makeK1(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const partnership = rand.pick(PARTNERSHIPS);
  const ordinary = rand.money(-18_000, 96_000, 61);
  const rental = rand.chance(0.4) ? rand.money(-9_000, 24_000, 31) : 0;
  const interest = rand.chance(0.5) ? rand.money(50, 3_000, 11) : 0;

  const specs: RegionSpec[] = [
    { label: "Partnership's name, address, city, state, ZIP", value: partnership, span: 2 },
    { boxLabel: "Part I A", label: "Partnership EIN", value: ein(rand) },
    { boxLabel: "Box 1", label: "Ordinary business income (loss)", value: m(ordinary) },
    { boxLabel: "Box 2", label: "Net rental real estate income (loss)", value: m(rental) },
    { boxLabel: "Box 5", label: "Interest income", value: m(interest) },
    { boxLabel: "Box 14", label: "Self-employment earnings (loss)", value: m(Math.max(0, ordinary)) },
    { boxLabel: "Box 20", label: "Other information — Code Z", value: "See statement" },
  ];

  return buildDoc(
    id, clientId, returnId, "K-1", partnership, specs,
    { ordinary, rental, interest },
    { 2: "ordinary", 3: "rental", 4: "interest" },
    rand,
  );
}

function makeCharity(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const org = rand.pick(CHARITIES);
  const amount = rand.money(150, 9_500, 25);

  const specs: RegionSpec[] = [
    { label: "Organization name", value: org, span: 2 },
    { label: "Amount of cash contribution", value: m(amount) },
    { label: "Date of contribution", value: `${rand.int(1, 12)}/${rand.int(1, 28)}/${TAX_YEAR}` },
    { label: "Goods or services provided in exchange", value: rand.chance(0.85) ? "None" : "See below" },
    { label: "Tax-exempt status", value: "501(c)(3)" },
  ];

  return buildDoc(id, clientId, returnId, "Charitable Receipt", org, specs, { amount }, { 1: "amount" }, rand);
}

function makePropertyTax(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const county = rand.pick(COUNTIES);
  const paid = rand.money(2_200, 18_000, 13);

  const specs: RegionSpec[] = [
    { label: "Taxing authority", value: county, span: 2 },
    { label: "Assessed value", value: m(paid * rand.float(60, 110)) },
    { label: "Real property tax paid", value: m(paid) },
    { label: "Parcel number", value: `${rand.int(100, 999)}-${rand.int(1000, 9999)}-${rand.int(10, 99)}` },
  ];

  return buildDoc(id, clientId, returnId, "Property Tax Statement", county, specs, { paid }, { 2: "paid" }, rand);
}

function makeBankStatement(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const bank = rand.pick(BANKS);
  const specs: RegionSpec[] = [
    { label: "Institution", value: bank, span: 2 },
    { label: "Account number", value: `••••${rand.int(1000, 9999)}` },
    { label: "Statement period", value: `12/01/${TAX_YEAR} – 12/31/${TAX_YEAR}` },
    { label: "Ending balance", value: m(rand.money(1_200, 240_000, 47)) },
    { label: "Interest paid this period", value: m(rand.money(0, 900, 3)) },
  ];
  return buildDoc(id, clientId, returnId, "Bank Statement", bank, specs, {}, {}, rand);
}

function makePriorYear(id: string, clientId: string, returnId: string, rand: Rand): BuiltDoc {
  const agi = rand.money(45_000, 320_000, 113);
  const specs: RegionSpec[] = [
    { label: "Taxpayer", value: `Filed ${TAX_YEAR - 1} · Form 1040`, span: 2 },
    { boxLabel: "Line 11", label: "Adjusted gross income", value: m(agi) },
    { boxLabel: "Line 12", label: "Standard deduction or itemized", value: m(rand.money(14_600, 42_000, 100)) },
    { boxLabel: "Line 15", label: "Taxable income", value: m(agi * 0.82) },
    { boxLabel: "Line 24", label: "Total tax", value: m(agi * rand.float(0.11, 0.23)) },
    { boxLabel: "Line 33", label: "Total payments", value: m(agi * rand.float(0.12, 0.24)) },
    { boxLabel: "Line 34", label: "Overpaid", value: m(rand.money(0, 6_400, 19)) },
    { boxLabel: "Line 36", label: "Amount applied to next year's estimated tax", value: m(rand.money(0, 3_000, 50)) },
    { boxLabel: "Line 37", label: "Amount you owe", value: m(0) },
    { label: "Preparer", value: "Gray & Grove CPA" },
  ];
  return buildDoc(id, clientId, returnId, "Prior Year Return", "Gray & Grove CPA", specs, { agi }, { 1: "agi" }, rand);
}

const DOC_MAKERS: Record<string, (id: string, c: string, r: string, rand: Rand) => BuiltDoc> = {
  "W-2": makeW2,
  "1099-INT": make1099Int,
  "1099-DIV": make1099Div,
  "1099-NEC": make1099Nec,
  "1099-B": make1099B,
  "1098": make1098,
  "1098-E": make1098E,
  "K-1": makeK1,
  "Charitable Receipt": makeCharity,
  "Property Tax Statement": makePropertyTax,
  "Bank Statement": makeBankStatement,
  "Prior Year Return": makePriorYear,
};

/* ------------------------------------------------------------------ *
 * Scenario assignment
 * ------------------------------------------------------------------ */

/**
 * Each return is assigned one "interesting" situation by rotating through this
 * list. Rotation rather than random draw guarantees every state is represented
 * often enough to be found by someone clicking around, which a purely random
 * dataset does not.
 */
const SCENARIOS = [
  "conflict",
  "missing-source",
  "anomaly",
  "clean",
  "low-confidence",
  "clean",
] as const;
type Scenario = (typeof SCENARIOS)[number];

/* ------------------------------------------------------------------ *
 * Field construction
 * ------------------------------------------------------------------ */

interface FieldSpec {
  key: string;
  form: string;
  line: string;
  label: string;
  section: SectionId;
}

function sumStep(label: string, detail: string, amount: number): TransformStep {
  return { label, detail, amount, kind: "source" };
}

function confidenceFor(rand: Rand, base: number) {
  return Math.min(0.995, Math.max(0.42, base + rand.float(-0.04, 0.04)));
}

/* ------------------------------------------------------------------ *
 * The generator
 * ------------------------------------------------------------------ */

interface ReturnDetail {
  documents: TaxDocument[];
  fields: ReturnField[];
}

function buildDetail(
  ret: TaxReturn,
  client: Client,
  scenario: Scenario,
  rand: Rand,
): ReturnDetail {
  const docs: BuiltDoc[] = [];
  const push = (kind: DocKind) => {
    const id = `${ret.id}-D${String(docs.length + 1).padStart(2, "0")}`;
    docs.push(DOC_MAKERS[kind](id, client.id, ret.id, rand));
  };

  // Every return has a prior year on file — it is what makes anomaly detection
  // explainable rather than arbitrary.
  push("Prior Year Return");

  const w2Count = client.kind === "Business" ? rand.int(0, 1) : rand.int(1, 3);
  for (let i = 0; i < w2Count; i++) push("W-2");

  const intCount = rand.int(1, 3);
  for (let i = 0; i < intCount; i++) push("1099-INT");

  if (rand.chance(0.75)) push("1099-DIV");
  if (rand.chance(0.45)) push("1099-B");
  if (rand.chance(0.35)) push("1099-NEC");
  if (rand.chance(0.6)) push("1098");
  if (rand.chance(0.4)) push("1098-E");
  if (client.kind === "Business" || rand.chance(0.3)) push("K-1");

  const charityCount = rand.int(0, 4);
  for (let i = 0; i < charityCount; i++) push("Charitable Receipt");

  if (rand.chance(0.5)) push("Property Tax Statement");
  if (rand.chance(0.4)) push("Bank Statement");

  // A duplicate upload — the same receipt sent twice, which is the most common
  // real-world cause of a double-counted deduction.
  const charities = docs.filter((d) => d.doc.kind === "Charitable Receipt");
  let duplicatePair: [BuiltDoc, BuiltDoc] | null = null;
  if (scenario === "conflict" && charities.length > 0) {
    const original = charities[0];
    const id = `${ret.id}-D${String(docs.length + 1).padStart(2, "0")}`;
    const copy: BuiltDoc = {
      doc: {
        ...original.doc,
        id,
        receivedAt: isoDate(addDays(new Date(original.doc.receivedAt + "T00:00:00Z"), rand.int(3, 40))),
        source: "Client upload",
        duplicateOf: original.doc.id,
        status: "Needs review",
        pages: original.doc.pages.map((p) => ({
          ...p,
          regions: p.regions.map((r) => ({ ...r, id: r.id.replace(original.doc.id, id) })),
        })),
      },
      amounts: original.amounts,
      regionFor: Object.fromEntries(
        Object.entries(original.regionFor).map(([k, v]) => [k, v.replace(original.doc.id, id)]),
      ),
    };
    docs.push(copy);
    duplicatePair = [original, copy];
  }

  const byKind = (kind: DocKind) => docs.filter((d) => d.doc.kind === kind);
  const documents = docs.map((d) => d.doc);
  const fields: ReturnField[] = [];

  const addField = (
    spec: FieldSpec,
    value: number,
    state: ReturnField["state"],
    ai?: AiAssessment,
    extra?: Partial<ReturnField>,
  ) => {
    fields.push({
      id: `${ret.id}-${spec.key}`,
      returnId: ret.id,
      form: spec.form,
      line: spec.line,
      label: spec.label,
      value: Math.round(value),
      state,
      ai,
      section: spec.section,
      ...extra,
    });
  };

  /* ---- Line 1a — Wages ------------------------------------------- */
  const w2s = byKind("W-2");
  const wages = w2s.reduce((s, d) => s + d.amounts.wages, 0);
  if (w2s.length > 0) {
    const multi = w2s.length > 1;
    const conf = confidenceFor(rand, scenario === "low-confidence" ? 0.66 : multi ? 0.93 : 0.97);
    const transform: TransformStep[] = [
      ...w2s.map((d) =>
        sumStep(`${d.doc.issuer}`, `Form W-2 · Box 1 · Wages, tips, other compensation`, d.amounts.wages),
      ),
    ];
    if (multi) {
      transform.push({
        label: "Sum of all W-2 Box 1 amounts",
        detail: `${w2s.length} W-2s from ${w2s.length} employers combined onto one line.`,
        amount: wages,
        kind: "sum",
      });
    }
    transform.push({
      label: "Reported on Form 1040 Line 1a",
      detail: "No further adjustment applies to this line.",
      amount: wages,
      kind: "result",
    });

    addField(
      { key: "wages", form: "Form 1040", line: "Line 1a", label: "Wages, salaries, tips", section: "income" },
      wages,
      conf < 0.75 ? "needs-approval" : "ai-unverified",
      {
        verdict: multi ? "derived" : "extracted",
        confidence: conf,
        summary: multi
          ? `Added Box 1 from ${w2s.length} W-2s.`
          : `Read Box 1 from the ${w2s[0].doc.issuer} W-2.`,
        transform,
        evidence: w2s.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.wages,
          note: "Box 1 — Wages, tips, other compensation",
        })),
        uncertainty:
          conf < 0.75
            ? "The scan of one W-2 is low resolution; the digit in the thousands place on Box 1 could be a 3 or an 8."
            : undefined,
        recommendation:
          conf < 0.75
            ? "Open the source scan and confirm Box 1 before accepting."
            : "Confirm the total matches the client's W-2s, then accept.",
      },
    );
  }

  /* ---- Line 2b — Taxable interest -------------------------------- */
  const ints = byKind("1099-INT");
  const interest = ints.reduce((s, d) => s + d.amounts.interest, 0);
  if (ints.length > 0) {
    const missingBank = scenario === "missing-source";
    addField(
      { key: "interest", form: "Form 1040", line: "Line 2b", label: "Taxable interest", section: "income" },
      interest,
      missingBank ? "needs-approval" : "ai-unverified",
      {
        verdict: missingBank ? "missing-source" : ints.length > 1 ? "derived" : "extracted",
        confidence: confidenceFor(rand, missingBank ? 0.58 : 0.95),
        summary: missingBank
          ? `Added Box 1 from ${ints.length} 1099-INTs, but one expected form is not here.`
          : `Added Box 1 from ${ints.length} 1099-INT${ints.length > 1 ? "s" : ""}.`,
        transform: [
          ...ints.map((d) => sumStep(d.doc.issuer, "Form 1099-INT · Box 1 · Interest income", d.amounts.interest)),
          {
            label: "Total taxable interest",
            detail: "Tax-exempt interest in Box 8 is excluded and reported separately on Line 2a.",
            amount: interest,
            kind: "sum",
          },
        ],
        evidence: ints.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.interest,
          note: "Box 1 — Interest income",
        })),
        uncertainty: missingBank
          ? `Last year's return included interest from ${rand.pick(BANKS)}. No 1099-INT from that institution has been received this year, so this total may be understated.`
          : undefined,
        recommendation: missingBank
          ? "Request the missing 1099-INT from the client before accepting this line."
          : "Accept if the client has no other interest-bearing accounts.",
      },
    );
  }

  /* ---- Line 3a / 3b — Dividends ---------------------------------- */
  const divs = byKind("1099-DIV");
  if (divs.length > 0) {
    const ordinary = divs.reduce((s, d) => s + d.amounts.ordinary, 0);
    const qualified = divs.reduce((s, d) => s + d.amounts.qualified, 0);
    addField(
      { key: "qualdiv", form: "Form 1040", line: "Line 3a", label: "Qualified dividends", section: "income" },
      qualified,
      "ai-unverified",
      {
        verdict: "extracted",
        confidence: confidenceFor(rand, 0.96),
        summary: `Read Box 1b from ${divs.length} 1099-DIV${divs.length > 1 ? "s" : ""}.`,
        transform: [
          ...divs.map((d) => sumStep(d.doc.issuer, "Form 1099-DIV · Box 1b · Qualified dividends", d.amounts.qualified)),
          { label: "Total qualified dividends", detail: "Taxed at capital gains rates.", amount: qualified, kind: "sum" },
        ],
        evidence: divs.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.qualified,
          note: "Box 1b — Qualified dividends",
        })),
        recommendation: "Accept — qualified dividends are a direct read with no adjustment.",
      },
    );
    addField(
      { key: "orddiv", form: "Form 1040", line: "Line 3b", label: "Ordinary dividends", section: "income" },
      ordinary,
      "ai-unverified",
      {
        verdict: "extracted",
        confidence: confidenceFor(rand, 0.96),
        summary: `Read Box 1a from ${divs.length} 1099-DIV${divs.length > 1 ? "s" : ""}.`,
        transform: [
          ...divs.map((d) => sumStep(d.doc.issuer, "Form 1099-DIV · Box 1a · Total ordinary dividends", d.amounts.ordinary)),
          { label: "Total ordinary dividends", detail: "Includes the qualified portion on Line 3a.", amount: ordinary, kind: "sum" },
        ],
        evidence: divs.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.ordinary,
          note: "Box 1a — Total ordinary dividends",
        })),
        recommendation: "Accept.",
      },
    );
  }

  /* ---- Line 7 — Capital gains ------------------------------------ */
  const bs = byKind("1099-B");
  if (bs.length > 0) {
    const net = bs.reduce((s, d) => s + d.amounts.net, 0);
    const capped = Math.max(net, -3000);
    const transform: TransformStep[] = [
      ...bs.flatMap((d) => [
        sumStep(`${d.doc.issuer} — proceeds`, "Form 1099-B · Box 1d", d.amounts.proceeds),
        sumStep(`${d.doc.issuer} — cost basis`, "Form 1099-B · Box 1e", -d.amounts.basis),
      ]),
      { label: "Net gain or loss", detail: "Proceeds less cost basis across all reported sales.", amount: net, kind: "sum" },
    ];
    if (capped !== net) {
      transform.push({
        label: "Capital loss limitation applied",
        detail: "Net capital losses deductible against ordinary income are capped at $3,000. The remainder carries forward.",
        amount: capped,
        kind: "limit",
      });
    }
    transform.push({ label: "Reported on Line 7", detail: "", amount: capped, kind: "result" });

    addField(
      { key: "capgain", form: "Form 1040", line: "Line 7", label: "Capital gain or (loss)", section: "income" },
      capped,
      "ai-unverified",
      {
        verdict: "derived",
        confidence: confidenceFor(rand, 0.88),
        summary:
          capped !== net
            ? "Netted broker proceeds against basis, then applied the $3,000 loss limit."
            : "Netted broker proceeds against cost basis.",
        transform,
        evidence: bs.flatMap((d) => [
          { documentId: d.doc.id, page: 1, regionId: d.regionFor.proceeds, note: "Box 1d — Proceeds" },
          { documentId: d.doc.id, page: 1, regionId: d.regionFor.basis, note: "Box 1e — Cost or other basis" },
        ]),
        uncertainty: bs.some((d) => d.doc.pages[0].regions.some((r) => r.value === "Noncovered"))
          ? "One lot is marked noncovered, so the broker did not report its basis to the IRS. The basis shown came from the client's own records and has not been independently confirmed."
          : undefined,
        recommendation: "Review the basis on noncovered lots, then accept.",
      },
    );
  }

  /* ---- K-1 income ------------------------------------------------- */
  const k1s = byKind("K-1");
  if (k1s.length > 0) {
    const total = k1s.reduce((s, d) => s + d.amounts.ordinary + d.amounts.rental, 0);
    addField(
      { key: "sched-e", form: "Schedule E", line: "Line 32", label: "Partnership and S-corp income", section: "income" },
      total,
      "needs-approval",
      {
        verdict: "derived",
        confidence: confidenceFor(rand, 0.79),
        summary: `Combined ordinary and rental income from ${k1s.length} K-1${k1s.length > 1 ? "s" : ""}.`,
        transform: [
          ...k1s.flatMap((d) => [
            sumStep(`${d.doc.issuer} — ordinary`, "Schedule K-1 · Box 1", d.amounts.ordinary),
            ...(d.amounts.rental !== 0
              ? [sumStep(`${d.doc.issuer} — rental`, "Schedule K-1 · Box 2", d.amounts.rental)]
              : []),
          ]),
          { label: "Total flow-through income", detail: "Carried to Schedule E, Part II.", amount: total, kind: "sum" },
        ],
        evidence: k1s.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.ordinary,
          note: "Box 1 — Ordinary business income (loss)",
        })),
        uncertainty:
          "Box 20 Code Z references a supplemental statement that was not included with the K-1. The QBI deduction cannot be computed from this document alone.",
        recommendation: "Request the Box 20 statement, or confirm QBI does not apply, before approving.",
      },
    );
  }

  /* ---- Student loan interest, with a real limit ------------------- */
  const sl = byKind("1098-E")[0];
  if (sl) {
    const raw = sl.amounts.interest;
    const allowed = Math.min(raw, 2500);
    addField(
      { key: "studentloan", form: "Schedule 1", line: "Line 21", label: "Student loan interest deduction", section: "adjustments" },
      allowed,
      "ai-unverified",
      {
        verdict: "derived",
        confidence: confidenceFor(rand, 0.94),
        summary:
          raw > 2500
            ? "Read Box 1, then capped it at the $2,500 statutory maximum."
            : "Read Box 1 from the 1098-E.",
        transform: [
          sumStep(sl.doc.issuer, "Form 1098-E · Box 1 · Student loan interest received", raw),
          ...(raw > 2500
            ? [
                {
                  label: "Statutory maximum applied",
                  detail: `Interest paid was ${money(raw)}. The deduction is limited to $2,500 per return.`,
                  amount: allowed,
                  kind: "limit" as const,
                },
              ]
            : []),
          { label: "Deduction claimed", detail: "Phase-out by income is applied later in the calculation.", amount: allowed, kind: "result" },
        ],
        evidence: [
          { documentId: sl.doc.id, page: 1, regionId: sl.regionFor.interest, note: "Box 1 — Student loan interest received" },
        ],
        uncertainty:
          "The income phase-out has not been applied yet — it depends on final AGI, which is not settled until income review is complete.",
        recommendation: "Accept the amount; the phase-out recalculates automatically once AGI is final.",
      },
    );
  }

  /* ---- Mortgage interest ------------------------------------------ */
  const mortgage = byKind("1098")[0];
  if (mortgage) {
    addField(
      { key: "mortgage", form: "Schedule A", line: "Line 8a", label: "Home mortgage interest", section: "deductions" },
      mortgage.amounts.interest,
      "ai-unverified",
      {
        verdict: mortgage.amounts.principal > 750_000 ? "anomaly" : "extracted",
        confidence: confidenceFor(rand, 0.95),
        summary: "Read Box 1 from the mortgage interest statement.",
        transform: [
          sumStep(mortgage.doc.issuer, "Form 1098 · Box 1 · Mortgage interest received", mortgage.amounts.interest),
          { label: "Claimed on Schedule A", detail: "", amount: mortgage.amounts.interest, kind: "result" },
        ],
        evidence: [
          { documentId: mortgage.doc.id, page: 1, regionId: mortgage.regionFor.interest, note: "Box 1 — Mortgage interest received" },
          { documentId: mortgage.doc.id, page: 1, regionId: mortgage.regionFor.principal, note: "Box 2 — Outstanding principal, used for the limit check" },
        ],
        uncertainty:
          mortgage.amounts.principal > 750_000
            ? `Outstanding principal is ${money(mortgage.amounts.principal)}, above the $750,000 limit for debt incurred after 2017. If this loan originated after December 15, 2017, the deductible interest must be prorated.`
            : undefined,
        recommendation:
          mortgage.amounts.principal > 750_000
            ? "Confirm the loan origination date before accepting the full amount."
            : "Accept.",
      },
    );
  }

  /* ---- Charitable contributions, incl. the duplicate conflict ----- */
  const charityDocs = byKind("Charitable Receipt");
  if (charityDocs.length > 0) {
    const unique = charityDocs.filter((d) => !d.doc.duplicateOf);
    const uniqueTotal = unique.reduce((s, d) => s + d.amounts.amount, 0);
    const naiveTotal = charityDocs.reduce((s, d) => s + d.amounts.amount, 0);
    const isConflict = duplicatePair !== null;

    addField(
      { key: "charity", form: "Schedule A", line: "Line 11", label: "Gifts to charity by cash or check", section: "deductions" },
      uniqueTotal,
      isConflict ? "needs-approval" : "ai-unverified",
      {
        verdict: isConflict ? "conflict" : "derived",
        confidence: confidenceFor(rand, isConflict ? 0.61 : 0.93),
        summary: isConflict
          ? "Two uploaded receipts appear to be the same gift."
          : `Added ${charityDocs.length} contribution receipt${charityDocs.length > 1 ? "s" : ""}.`,
        transform: [
          ...unique.map((d) => sumStep(d.doc.issuer, "Contribution receipt · Amount of cash contribution", d.amounts.amount)),
          ...(isConflict
            ? [
                {
                  label: "Suspected duplicate excluded",
                  detail: `A second receipt from ${duplicatePair![0].doc.issuer} for the same amount and date was uploaded ${daysBetween(duplicatePair![1].doc.receivedAt, duplicatePair![0].doc.receivedAt)} days after the first. It has been left out of this total.`,
                  amount: -duplicatePair![0].amounts.amount,
                  kind: "adjust" as const,
                },
              ]
            : []),
          { label: "Total cash contributions", detail: "", amount: uniqueTotal, kind: "result" },
        ],
        evidence: charityDocs.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.amount,
          note: d.doc.duplicateOf ? "Suspected duplicate of an earlier receipt" : "Amount of cash contribution",
        })),
        uncertainty: isConflict
          ? "The two receipts are identical in organization, amount and date. They are either one gift uploaded twice, or two identical gifts. The documents alone cannot settle it."
          : undefined,
        recommendation: isConflict
          ? "Ask the client whether they made one gift or two, then pick one of the two readings above."
          : "Accept.",
        alternatives: isConflict
          ? [
              {
                value: uniqueTotal,
                documentId: duplicatePair![0].doc.id,
                note: `Treat as one gift — excludes the ${money(duplicatePair![0].amounts.amount)} duplicate. This is the recommended reading.`,
              },
              {
                value: naiveTotal,
                documentId: duplicatePair![1].doc.id,
                note: `Treat as two separate gifts — counts both receipts, totalling ${money(naiveTotal)}.`,
              },
            ]
          : undefined,
      },
    );
  }

  /* ---- Property tax ----------------------------------------------- */
  const propTax = byKind("Property Tax Statement")[0];
  if (propTax) {
    const allowed = Math.min(propTax.amounts.paid, 10_000);
    addField(
      { key: "salt", form: "Schedule A", line: "Line 5b", label: "State and local real estate taxes", section: "deductions" },
      allowed,
      "ai-unverified",
      {
        verdict: "derived",
        confidence: confidenceFor(rand, 0.9),
        summary: propTax.amounts.paid > 10_000 ? "Read the tax paid, then applied the SALT cap." : "Read the real property tax paid.",
        transform: [
          sumStep(propTax.doc.issuer, "Property tax statement · Real property tax paid", propTax.amounts.paid),
          ...(propTax.amounts.paid > 10_000
            ? [
                {
                  label: "SALT cap applied",
                  detail: "Combined state and local tax deduction is limited to $10,000.",
                  amount: allowed,
                  kind: "limit" as const,
                },
              ]
            : []),
          { label: "Claimed on Schedule A", detail: "", amount: allowed, kind: "result" },
        ],
        evidence: [{ documentId: propTax.doc.id, page: 1, regionId: propTax.regionFor.paid, note: "Real property tax paid" }],
        recommendation: "Accept.",
      },
    );
  }

  /* ---- Withholding ------------------------------------------------ */
  const withheld = w2s.reduce((s, d) => s + d.amounts.fedTax, 0);
  if (w2s.length > 0) {
    addField(
      { key: "withheld", form: "Form 1040", line: "Line 25a", label: "Federal income tax withheld from W-2", section: "payments" },
      withheld,
      "ai-unverified",
      {
        verdict: w2s.length > 1 ? "derived" : "extracted",
        confidence: confidenceFor(rand, 0.97),
        summary: `Added Box 2 from ${w2s.length} W-2${w2s.length > 1 ? "s" : ""}.`,
        transform: [
          ...w2s.map((d) => sumStep(d.doc.issuer, "Form W-2 · Box 2 · Federal income tax withheld", d.amounts.fedTax)),
          { label: "Total federal withholding", detail: "", amount: withheld, kind: "sum" },
        ],
        evidence: w2s.map((d) => ({
          documentId: d.doc.id,
          page: 1,
          regionId: d.regionFor.fedTax,
          note: "Box 2 — Federal income tax withheld",
        })),
        recommendation: "Accept.",
      },
    );
  }

  /* ---- Calculated + locked lines ---------------------------------- */
  // Line 3a (qualified dividends) is a subset of Line 3b (ordinary dividends),
  // reported separately only because it is taxed at a different rate. Adding
  // both would double-count, which is the kind of error the reviewers of this
  // prototype would spot instantly.
  const incomeTotal = fields
    .filter((f) => f.section === "income" && !f.id.endsWith("-qualdiv"))
    .reduce((s, f) => s + f.value, 0);

  addField(
    { key: "agi", form: "Form 1040", line: "Line 11", label: "Adjusted gross income", section: "summary" },
    incomeTotal - fields.filter((f) => f.section === "adjustments").reduce((s, f) => s + f.value, 0),
    "calculated",
    undefined,
    {
      priorYear: byKind("Prior Year Return")[0]?.amounts.agi,
    },
  );

  const itemized = fields.filter((f) => f.section === "deductions").reduce((s, f) => s + f.value, 0);
  const standard = 15_000;
  addField(
    { key: "deduction", form: "Form 1040", line: "Line 12", label: "Standard deduction or itemized deductions", section: "deductions" },
    Math.max(itemized, standard),
    "calculated",
  );

  addField(
    { key: "efile", form: "Form 8879", line: "Part II", label: "Taxpayer PIN / e-file authorization", section: "summary" },
    0,
    "locked",
    undefined,
    { lockReason: "Locked until the client signs Form 8879. Only the taxpayer can supply this." },
  );

  if (ret.stage === "Filed") {
    addField(
      { key: "filed", form: "Form 1040", line: "Filing", label: "Accepted by IRS", section: "summary" },
      0,
      "locked",
      undefined,
      { lockReason: "This return has been accepted by the IRS. Changes now require an amended return (Form 1040-X)." },
    );
  }

  // A plain editable field so the affordance system shows a field that no
  // machine has ever touched, side by side with ones that have.
  addField(
    { key: "estimated", form: "Form 1040", line: "Line 26", label: "Estimated tax payments made", section: "payments" },
    rand.chance(0.4) ? rand.money(0, 24_000, 500) : 0,
    "editable",
  );

  /* ---- Anomaly overlay -------------------------------------------- */
  if (scenario === "anomaly") {
    const target = fields.find((f) => f.section === "income" && f.ai);
    const prior = byKind("Prior Year Return")[0];
    if (target && target.ai && prior) {
      const priorValue = Math.round(target.value * rand.float(0.3, 0.55));
      target.priorYear = priorValue;
      target.state = "needs-approval";
      target.ai = {
        ...target.ai,
        verdict: "anomaly",
        confidence: Math.min(target.ai.confidence, 0.83),
        summary: `${target.label} is ${Math.round((target.value / priorValue - 1) * 100)}% higher than last year.`,
        uncertainty: `The extraction itself looks clean. What is unusual is the size of the change: ${money(priorValue)} last year against ${money(target.value)} this year. That is a real pattern break, not necessarily an error.`,
        recommendation: "Confirm with the client that the increase is expected, then accept.",
        evidence: [
          ...target.ai.evidence,
          { documentId: prior.doc.id, page: 1, regionId: prior.regionFor.agi, note: `Prior year comparison — ${TAX_YEAR - 1} return on file` },
        ],
      };
    }
  }

  return { documents, fields };
}

/* ------------------------------------------------------------------ *
 * Top-level generation
 * ------------------------------------------------------------------ */

// One return per client keeps the demo honest — two 2025 filings for the same
// person would be a data bug a CPA would spot in the first ten seconds.
const CLIENT_COUNT = 245;
const RETURN_COUNT = 240;

function generate() {
  const rand = new Rand(20260723);

  const clients: Client[] = [];
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const isBiz = rand.chance(0.28);
    const name = isBiz
      ? `${rand.pick(BIZ_PREFIX)} ${rand.pick(BIZ_SUFFIX)}`
      : `${rand.pick(FIRST)} ${rand.pick(LAST)}`;
    clients.push({
      id: `C${String(i + 1).padStart(3, "0")}`,
      name,
      kind: isBiz ? "Business" : "Individual",
      entity: isBiz ? rand.pick(["S-Corporation", "Partnership", "LLC"]) : undefined,
      since: rand.int(2009, 2025),
      tier: rand.weighted([
        ["Standard" as const, 6],
        ["Premium" as const, 3],
        ["Strategic" as const, 1],
      ]),
    });
  }

  const returns: TaxReturn[] = [];
  const documentsById = new Map<string, TaxDocument>();
  const fieldsByReturn = new Map<string, ReturnField[]>();
  const docsByReturn = new Map<string, TaxDocument[]>();

  for (let i = 0; i < RETURN_COUNT; i++) {
    const client = clients[i % clients.length];
    const id = `R${String(i + 1).padStart(4, "0")}`;
    const scenario = SCENARIOS[i % SCENARIOS.length];

    const stage = rand.weighted<ReturnStage>([
      ["Intake", 2],
      ["Docs pending", 4],
      ["Extraction review", 5],
      ["Preparation", 5],
      ["Manager review", 3],
      ["Client signature", 3],
      ["Filed", 4],
    ]);

    const extended = rand.chance(0.55);
    // Extended returns run to the October deadline. The rest carry internal
    // firm deadlines spread around today — enough overdue work to make the
    // dashboard's ranking matter, not so much that everything is red and the
    // ranking stops discriminating.
    const dueDate = extended
      ? isoDate(addDays(new Date("2026-10-15T00:00:00Z"), rand.int(-6, 4)))
      : isoDate(addDays(TODAY, rand.int(-24, 64)));

    const ret: TaxReturn = {
      id,
      clientId: client.id,
      taxYear: TAX_YEAR,
      form: client.kind === "Business" ? rand.pick(["1120-S", "1065"] as const) : "1040",
      stage,
      assignedTo: rand.weighted<RoleId>([
        ["preparer", 6],
        ["reviewer", 3],
        ["manager", 1],
      ]),
      dueDate,
      extended,
      docCount: 0,
      unresolvedAiCount: 0,
      openItems: [],
      minutesLogged: rand.int(0, 640),
      refundOrDue: rand.money(-14_000, 22_000, 37),
      lastActivityDays: rand.int(0, 41),
    };

    const detail = buildDetail(ret, client, scenario, rand);

    ret.docCount = detail.documents.length;
    ret.unresolvedAiCount = detail.fields.filter(
      (f) => f.state === "ai-unverified" || f.state === "needs-approval",
    ).length;

    const items: OpenItem[] = [];
    const needsApproval = detail.fields.filter((f) => f.state === "needs-approval");
    for (const f of needsApproval) {
      items.push({
        id: `${id}-OI-${f.id}`,
        returnId: id,
        label:
          f.ai?.verdict === "conflict"
            ? `Resolve conflicting sources on ${f.line}`
            : f.ai?.verdict === "missing-source"
              ? `Missing document for ${f.label}`
              : `Approve ${f.label}`,
        owner: f.ai?.verdict === "missing-source" ? "Client" : "Firm",
        kind:
          f.ai?.verdict === "conflict"
            ? "Conflict"
            : f.ai?.verdict === "missing-source"
              ? "Missing document"
              : "Open question",
        ageDays: rand.int(1, 34),
      });
    }
    if (stage === "Client signature") {
      items.push({
        id: `${id}-OI-sig`,
        returnId: id,
        label: "Client signature on Form 8879",
        owner: "Client",
        kind: "Signature",
        ageDays: rand.int(1, 22),
      });
    }
    if (stage === "Docs pending") {
      items.push({
        id: `${id}-OI-docs`,
        returnId: id,
        label: `Awaiting ${rand.int(2, 6)} source documents`,
        owner: "Client",
        kind: "Missing document",
        ageDays: rand.int(3, 45),
      });
    }
    ret.openItems = items;

    returns.push(ret);
    fieldsByReturn.set(id, detail.fields);
    docsByReturn.set(id, detail.documents);
    for (const d of detail.documents) documentsById.set(d.id, d);
  }

  return {
    clients,
    returns,
    documentsById,
    fieldsByReturn,
    docsByReturn,
    allDocuments: [...documentsById.values()],
  };
}

const DB = generate();

/* ------------------------------------------------------------------ *
 * Accessors
 * ------------------------------------------------------------------ */

export const clients = DB.clients;
export const returns = DB.returns;
export const allDocuments = DB.allDocuments;

const clientById = new Map(DB.clients.map((c) => [c.id, c]));
const returnById = new Map(DB.returns.map((r) => [r.id, r]));

export function getClient(id: string): Client | undefined {
  return clientById.get(id);
}

export function getReturn(id: string): TaxReturn | undefined {
  return returnById.get(id);
}

export function getFields(returnId: string): ReturnField[] {
  return DB.fieldsByReturn.get(returnId) ?? [];
}

export function getDocuments(returnId: string): TaxDocument[] {
  return DB.docsByReturn.get(returnId) ?? [];
}

export function getDocument(id: string): TaxDocument | undefined {
  return DB.documentsById.get(id);
}

export function getRegion(documentId: string, regionId: string): Region | undefined {
  const doc = DB.documentsById.get(documentId);
  if (!doc) return undefined;
  for (const page of doc.pages) {
    const hit = page.regions.find((r) => r.id === regionId);
    if (hit) return hit;
  }
  return undefined;
}

export function getRole(id: RoleId): Role {
  return ROLES.find((r) => r.id === id)!;
}

/** Returns with something genuinely worth looking at, used for demo entry points. */
export function featuredReturns(): TaxReturn[] {
  const wanted = new Set(["conflict", "missing-source", "anomaly"]);
  return DB.returns.filter((r) =>
    getFields(r.id).some((f) => f.ai && wanted.has(f.ai.verdict)),
  );
}

export const STATS = {
  clients: DB.clients.length,
  returns: DB.returns.length,
  documents: DB.allDocuments.length,
  fields: [...DB.fieldsByReturn.values()].reduce((s, f) => s + f.length, 0),
};
