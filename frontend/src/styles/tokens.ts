// frontend/src/styles/tokens.ts
// TypeScript export of token values needed in JS logic (e.g. semantic state colors).
// Keep in sync with tokens.css — these are the same values, typed for JS consumption.

export const colors = {
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceSunken: "#EEF0F3",
  primary: "#3949AB",
  primaryHover: "#2E3A8C",
  primarySubtle: "#E8EAF6",
  accent: "#F59E0B",
  accentText: "#92400E",
  accentSubtle: "#FEF3C7",
  text: "#1A1D23",
  textMuted: "#5B616E",
  textDisabled: "#9AA0AC",
  border: "#DDE1E6",
  divider: "#E9ECEF",
  success: "#1E8E5A",
  successSubtle: "#E3F5EC",
  warning: "#B45309",
  warningSubtle: "#FEF3E2",
  error: "#C0341D",
  errorSubtle: "#FBE9E6",
  info: "#0E7490",
  infoSubtle: "#E1F3F6",
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
