// frontend/src/styles/tokens.ts
// TypeScript export of token values needed in JS logic (e.g. semantic state colors).
// Keep in sync with tokens.css — these are the same values, typed for JS consumption.

export const colors = {
  bg: "#F6FAFE",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceSunken: "#E3F2FD",
  primary: "#2196F3",
  primaryHover: "#0D47A1",
  primaryMid: "#90CAF9",
  primarySubtle: "#E3F2FD",
  accent: "#E8912D",
  accentText: "#8A4B08",
  accentSubtle: "#FBEADB",
  text: "#10233D",
  textMuted: "#4E6079",
  textDisabled: "#9AACC2",
  border: "#D7E4F2",
  divider: "#E6EEF7",
  success: "#1F8A5A",
  successSubtle: "#E3F5EC",
  warning: "#8A4B08",
  warningSubtle: "#FBEADB",
  error: "#C1402C",
  errorSubtle: "#FBE7E3",
  info: "#0D47A1",
  infoSubtle: "#E3F2FD",
} as const;

// Semantic state → color pairing (for JS-driven styling where Tailwind classes aren't sufficient)
export type SemanticState =
  | "available"
  | "unavailable"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "pending"
  | "confirmed"
  | "conflict"
  | "full"
  | "empty"
  | "loading"
  | "error"
  | "no_answer";

export const stateColors: Record<SemanticState, { text: string; bg: string }> = {
  available:   { text: colors.success,     bg: colors.successSubtle },
  unavailable: { text: colors.error,       bg: colors.errorSubtle },
  upcoming:    { text: colors.primary,     bg: colors.primarySubtle },
  ongoing:     { text: colors.accentText,  bg: colors.accentSubtle },
  completed:   { text: colors.textMuted,   bg: colors.surfaceSunken },
  cancelled:   { text: colors.textMuted,   bg: colors.surfaceSunken },
  pending:     { text: colors.warning,     bg: colors.warningSubtle },
  confirmed:   { text: colors.success,     bg: colors.successSubtle },
  conflict:    { text: colors.error,       bg: colors.errorSubtle },
  full:        { text: colors.warning,     bg: colors.warningSubtle },
  empty:       { text: colors.textMuted,   bg: colors.surface },
  loading:     { text: colors.textMuted,   bg: colors.surface },
  error:       { text: colors.error,       bg: colors.errorSubtle },
  no_answer:   { text: colors.info,        bg: colors.infoSubtle },
};
