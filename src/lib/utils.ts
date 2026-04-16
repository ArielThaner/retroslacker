export function getSprintLabel(sprintId: string): string {
  if (sprintId === "sprint-24") {
    return "Sprint 24 \u2014 Week of April 7";
  }
  return sprintId;
}

export function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
