// Tag taxonomy for retro items. Applied in the UI to categorize items by theme.
export const RETRO_TAGS = [
  "QA",
  "Design Solution",
  "Spec",
  "Development",
  "Other",
] as const;

export type RetroTag = (typeof RETRO_TAGS)[number];

export const DEFAULT_RETRO_TAG: RetroTag = "Other";

// Visual styling for tag chips. Keeps color assignments consistent across the UI.
export const RETRO_TAG_STYLES: Record<RetroTag, { bg: string; text: string; border: string }> = {
  QA: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  "Design Solution": { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  Spec: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  Development: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  Other: { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" },
};

export function isRetroTag(value: string): value is RetroTag {
  return (RETRO_TAGS as readonly string[]).includes(value);
}
