"use client";

/**
 * In-memory session state.
 *
 * Decisions a user makes — accepting an AI value, overriding it, flagging it
 * back to the client — are held here for the life of the page. There is no
 * persistence and no server: this is the layer that would talk to an API in a
 * real build, and keeping it behind one interface is what makes that swap a
 * contained change rather than a rewrite.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { FieldState, ReturnField, RoleId } from "@/lib/types";
import { ROLES } from "@/lib/data";

export interface FieldOverride {
  value: number;
  state: FieldState;
  /** Set when a human typed a value that differs from what the AI proposed. */
  correctedFrom?: number;
  note?: string;
  by: RoleId;
  /** Sequence number rather than a timestamp — keeps rendering deterministic. */
  seq: number;
}

export interface ActivityEntry {
  seq: number;
  fieldId: string;
  returnId: string;
  kind: "accepted" | "corrected" | "flagged" | "reverted";
  label: string;
  detail: string;
  by: RoleId;
}

interface State {
  role: RoleId;
  overrides: Record<string, FieldOverride>;
  activity: ActivityEntry[];
  seq: number;
}

type Action =
  | { type: "set-role"; role: RoleId }
  | { type: "edit"; field: ReturnField; value: number }
  | { type: "accept"; field: ReturnField }
  | { type: "correct"; field: ReturnField; value: number; note?: string }
  | { type: "flag"; field: ReturnField; note: string }
  | { type: "revert"; field: ReturnField };

const initial: State = { role: "preparer", overrides: {}, activity: [], seq: 1 };

function label(field: ReturnField) {
  return `${field.line} · ${field.label}`;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-role":
      return { ...state, role: action.role };

    // A plain editable field has no AI claim to argue with, so typing in it is
    // just a value change — it does not become "verified" and it does not open
    // a review. Keeping this separate from `correct` is what stops the verified
    // state from meaning two different things.
    case "edit": {
      const f = action.field;
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [f.id]: { value: action.value, state: f.state, by: state.role, seq: state.seq },
        },
      };
    }

    case "accept": {
      const f = action.field;
      const current = state.overrides[f.id]?.value ?? f.value;
      return {
        ...state,
        seq: state.seq + 1,
        overrides: {
          ...state.overrides,
          [f.id]: { value: current, state: "verified", by: state.role, seq: state.seq },
        },
        activity: [
          {
            seq: state.seq,
            fieldId: f.id,
            returnId: f.returnId,
            kind: "accepted",
            label: label(f),
            detail: "Accepted the extracted value as correct.",
            by: state.role,
          },
          ...state.activity,
        ],
      };
    }

    case "correct": {
      const f = action.field;
      const from = state.overrides[f.id]?.correctedFrom ?? f.value;
      return {
        ...state,
        seq: state.seq + 1,
        overrides: {
          ...state.overrides,
          [f.id]: {
            value: action.value,
            state: "verified",
            correctedFrom: from,
            note: action.note,
            by: state.role,
            seq: state.seq,
          },
        },
        activity: [
          {
            seq: state.seq,
            fieldId: f.id,
            returnId: f.returnId,
            kind: "corrected",
            label: label(f),
            detail: action.note?.trim()
              ? action.note.trim()
              : "Replaced the extracted value with a reviewed figure.",
            by: state.role,
          },
          ...state.activity,
        ],
      };
    }

    case "flag": {
      const f = action.field;
      return {
        ...state,
        seq: state.seq + 1,
        overrides: {
          ...state.overrides,
          [f.id]: {
            value: state.overrides[f.id]?.value ?? f.value,
            state: "needs-approval",
            note: action.note,
            by: state.role,
            seq: state.seq,
          },
        },
        activity: [
          {
            seq: state.seq,
            fieldId: f.id,
            returnId: f.returnId,
            kind: "flagged" as const,
            label: label(f),
            detail: action.note,
            by: state.role,
          },
          ...state.activity,
        ],
      };
    }

    case "revert": {
      const f = action.field;
      const { [f.id]: _dropped, ...rest } = state.overrides;
      return {
        ...state,
        seq: state.seq + 1,
        overrides: rest,
        activity: [
          {
            seq: state.seq,
            fieldId: f.id,
            returnId: f.returnId,
            kind: "reverted",
            label: label(f),
            detail: "Reverted to the value the AI originally proposed.",
            by: state.role,
          },
          ...state.activity,
        ],
      };
    }
  }
}

interface StoreValue extends State {
  setRole: (role: RoleId) => void;
  edit: (field: ReturnField, value: number) => void;
  accept: (field: ReturnField) => void;
  correct: (field: ReturnField, value: number, note?: string) => void;
  flag: (field: ReturnField, note: string) => void;
  revert: (field: ReturnField) => void;
  /** Applies any session override on top of the generated field. */
  resolve: (field: ReturnField) => ReturnField & { override?: FieldOverride };
  roleInfo: (typeof ROLES)[number];
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const resolve = useCallback(
    (field: ReturnField) => {
      const o = state.overrides[field.id];
      if (!o) return field;
      return { ...field, value: o.value, state: o.state, override: o };
    },
    [state.overrides],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      setRole: (role) => dispatch({ type: "set-role", role }),
      edit: (field, v) => dispatch({ type: "edit", field, value: v }),
      accept: (field) => dispatch({ type: "accept", field }),
      correct: (field, v, note) => dispatch({ type: "correct", field, value: v, note }),
      flag: (field, note) => dispatch({ type: "flag", field, note }),
      revert: (field) => dispatch({ type: "revert", field }),
      resolve,
      roleInfo: ROLES.find((r) => r.id === state.role)!,
    }),
    [state, resolve],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
