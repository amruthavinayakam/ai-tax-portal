/**
 * Prioritisation.
 *
 * This is real logic, not a sorted list of hand-picked demo rows. Every return
 * in the dataset is scored by the same function, and the dashboard shows the
 * score's components rather than the score itself — a preparer should be able
 * to disagree with the ranking on specific grounds, which is only possible if
 * the reasons are visible.
 *
 * Two rules shaped the weights:
 *
 *  1. Blocked-on-someone-else outranks large-but-unstarted. A return sitting on
 *     a client for 30 days is more urgent than a bigger one you simply haven't
 *     opened, because the fix is a nudge, not a day of work.
 *  2. Fee tier is a tiebreak, never a driver. If revenue ranked work, the
 *     dashboard would quietly become a sales tool and preparers would stop
 *     trusting it.
 */

import type { Client, PriorityReason, RankedReturn, RoleId, TaxReturn } from "./types";
import { getClient, getFields, returns } from "./data";
import { TODAY, isoDate, daysBetween } from "./format";

const TODAY_ISO = isoDate(TODAY);

export function scoreReturn(ret: TaxReturn, client: Client): RankedReturn {
  const daysToDue = daysBetween(ret.dueDate, TODAY_ISO);
  const reasons: PriorityReason[] = [];

  // --- Deadline pressure -------------------------------------------------
  if (daysToDue < 0) {
    reasons.push({
      label: `${Math.abs(daysToDue)} days past due`,
      points: 60 + Math.min(40, Math.abs(daysToDue)),
      tone: "stop",
    });
  } else if (daysToDue <= 7) {
    reasons.push({ label: `Due in ${daysToDue} days`, points: 45 - daysToDue * 2, tone: "stop" });
  } else if (daysToDue <= 21) {
    reasons.push({ label: `Due in ${daysToDue} days`, points: 24 - daysToDue * 0.5, tone: "warn" });
  }

  // --- Conflicts block everything else -----------------------------------
  const conflicts = ret.openItems.filter((i) => i.kind === "Conflict");
  if (conflicts.length > 0) {
    reasons.push({
      label: `${conflicts.length} unresolved source conflict${conflicts.length > 1 ? "s" : ""}`,
      points: 34 * conflicts.length,
      tone: "stop",
    });
  }

  // --- Waiting on the client, and ageing ---------------------------------
  const clientItems = ret.openItems.filter((i) => i.owner === "Client");
  if (clientItems.length > 0) {
    const oldest = Math.max(...clientItems.map((i) => i.ageDays));
    reasons.push({
      label: `Waiting on client ${oldest} days`,
      points: Math.min(38, 8 + oldest * 1.1),
      tone: "warn",
    });
  }

  // --- AI work queued for a human ----------------------------------------
  if (ret.unresolvedAiCount > 0) {
    reasons.push({
      label: `${ret.unresolvedAiCount} AI values awaiting review`,
      points: Math.min(26, ret.unresolvedAiCount * 3),
      tone: "ai",
    });
  }

  // --- Stalled work -------------------------------------------------------
  if (ret.lastActivityDays > 14 && ret.stage !== "Filed") {
    reasons.push({
      label: `No activity for ${ret.lastActivityDays} days`,
      points: Math.min(20, ret.lastActivityDays * 0.6),
      tone: "warn",
    });
  }

  // --- Nearly done: small push, high payoff ------------------------------
  if (ret.stage === "Manager review" || ret.stage === "Client signature") {
    reasons.push({ label: "Close to filing", points: 12, tone: "ink" });
  }

  // --- Tiebreak only ------------------------------------------------------
  if (client.tier === "Strategic") {
    reasons.push({ label: "Strategic client", points: 4, tone: "ink" });
  } else if (client.tier === "Premium") {
    reasons.push({ label: "Premium client", points: 2, tone: "ink" });
  }

  // Filed returns leave the queue entirely.
  const filed = ret.stage === "Filed";
  const score = filed ? 0 : Math.round(reasons.reduce((s, r) => s + r.points, 0));

  return {
    ret,
    client,
    score,
    reasons: reasons.sort((a, b) => b.points - a.points),
    nextAction: nextActionFor(ret),
    daysToDue,
  };
}

/**
 * The single sentence the dashboard puts in front of someone. A dashboard row
 * that says "In Progress" has told you nothing; this says what to do.
 */
export function nextActionFor(ret: TaxReturn): string {
  const conflict = ret.openItems.find((i) => i.kind === "Conflict");
  if (conflict) return "Resolve conflicting sources";

  const missing = ret.openItems.find((i) => i.kind === "Missing document");
  if (missing) return missing.owner === "Client" ? "Chase client for documents" : "Locate missing document";

  if (ret.stage === "Client signature") return "Follow up on signature";
  if (ret.stage === "Manager review") return "Complete manager review";
  if (ret.unresolvedAiCount > 0) return `Review ${ret.unresolvedAiCount} extracted values`;
  if (ret.stage === "Intake") return "Start intake";
  if (ret.stage === "Preparation") return "Continue preparation";
  if (ret.stage === "Filed") return "Nothing — filed";
  return "Review and advance";
}

export function rankAll(roleFilter?: RoleId): RankedReturn[] {
  return returnsForRole(roleFilter)
    .map((ret) => scoreReturn(ret, getClient(ret.clientId)!))
    .sort((a, b) => b.score - a.score || a.daysToDue - b.daysToDue);
}

/**
 * A manager sees the whole book; everyone else sees only what is assigned to
 * them. This is the one place that decision is made.
 */
function returnsForRole(role?: RoleId) {
  if (!role || role === "manager") return returns;
  return returns.filter((r) => r.assignedTo === role);
}

/* ------------------------------------------------------------------ *
 * Aggregates for the manager view
 * ------------------------------------------------------------------ */

export interface Bottleneck {
  stage: string;
  count: number;
  oldestDays: number;
  waitingOnClient: number;
}

export function bottlenecks(ranked: RankedReturn[]): Bottleneck[] {
  const byStage = new Map<string, RankedReturn[]>();
  for (const r of ranked) {
    if (r.ret.stage === "Filed") continue;
    if (!byStage.has(r.ret.stage)) byStage.set(r.ret.stage, []);
    byStage.get(r.ret.stage)!.push(r);
  }
  return [...byStage.entries()]
    .map(([stage, items]) => ({
      stage,
      count: items.length,
      oldestDays: Math.max(...items.map((i) => i.ret.lastActivityDays)),
      waitingOnClient: items.filter((i) => i.ret.openItems.some((o) => o.owner === "Client")).length,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface Workload {
  role: RoleId;
  open: number;
  overdue: number;
  aiPending: number;
  hours: number;
}

export function workloads(all: RankedReturn[]): Workload[] {
  const roles: RoleId[] = ["preparer", "reviewer", "manager"];
  return roles.map((role) => {
    const mine = all.filter((r) => r.ret.assignedTo === role && r.ret.stage !== "Filed");
    return {
      role,
      open: mine.length,
      overdue: mine.filter((r) => r.daysToDue < 0).length,
      aiPending: mine.reduce((s, r) => s + r.ret.unresolvedAiCount, 0),
      hours: Math.round(mine.reduce((s, r) => s + r.ret.minutesLogged, 0) / 60),
    };
  });
}

/** Counts used by the dashboard's filter chips. */
export function queueCounts(ranked: RankedReturn[]) {
  return {
    all: ranked.filter((r) => r.ret.stage !== "Filed").length,
    overdue: ranked.filter((r) => r.daysToDue < 0 && r.ret.stage !== "Filed").length,
    conflicts: ranked.filter(
      (r) => r.ret.stage !== "Filed" && r.ret.openItems.some((i) => i.kind === "Conflict"),
    ).length,
    waitingClient: ranked.filter(
      (r) => r.ret.stage !== "Filed" && r.ret.openItems.some((i) => i.owner === "Client"),
    ).length,
    aiReview: ranked.filter((r) => r.ret.unresolvedAiCount > 0 && r.ret.stage !== "Filed").length,
  };
}

/** Percentage complete through the stage pipeline. Derived, never stored. */
export function stageProgress(stage: string): number {
  const order = [
    "Intake",
    "Docs pending",
    "Extraction review",
    "Preparation",
    "Manager review",
    "Client signature",
    "Filed",
  ];
  const idx = order.indexOf(stage);
  return idx < 0 ? 0 : Math.round((idx / (order.length - 1)) * 100);
}

/** Total unresolved AI decisions across a set — the "AI inbox" badge. */
export function totalAiPending(ranked: RankedReturn[]): number {
  return ranked
    .filter((r) => r.ret.stage !== "Filed")
    .reduce((s, r) => s + r.ret.unresolvedAiCount, 0);
}

export function conflictFields(returnId: string) {
  return getFields(returnId).filter((f) => f.ai?.verdict === "conflict");
}
