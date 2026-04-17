import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { parseTags } from "@/lib/tag-classifier";
import { RETRO_TAGS, type RetroTag } from "@/lib/tags";
import {
  HISTORICAL_ACTION_DATA,
  HISTORICAL_TAG_TREND,
  WEEKLY_DATA,
} from "@/lib/seed-data";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const sprintLabel = getSprintLabel(SPRINT_ID);

  const sessions = await prisma.retroSession.findMany({
    orderBy: { createdAt: "asc" },
  });

  const currentSession = sessions.find((s) => s.sprintId === SPRINT_ID);

  const retroTrend = sessions
    .filter((s) => s.sentiment)
    .map((s) => ({
      sprint: s.sprintId.replace("sprint-", "Sprint "),
      sentiment: parseInt(s.sentiment ?? "0", 10),
      isCurrent: s.sprintId === SPRINT_ID,
    }));

  // Fetch all users for per-person weekly data
  const allUsers = await prisma.user.findMany();

  const teamMembers = allUsers.map((u) => ({
    name: u.name,
    avatarUrl: u.avatarUrl,
    avatarColor: u.avatarColor,
  }));

  // Per-person weekly sentiment — sourced from the single seed record so
  // Amy's consistently-high and Morgan's consistently-low signals stay
  // aligned with the retro items they author.
  const weeklyData = WEEKLY_DATA;

  // Action items data per sprint (simulated historical + real current)
  const currentActionCount = await prisma.actionItem.count({
    where: { session: { sprintId: SPRINT_ID } },
  });
  const currentCompletedCount = await prisma.actionItem.count({
    where: { session: { sprintId: SPRINT_ID }, assignedUserId: { not: null } },
  });

  // 8 sprints of history for the "Actions by Sprint" bar chart. Sprints
  // 17–23 come from the shared seed record; Sprint 24 is the live sprint
  // and is computed from real DB rows (with seed defaults as a fallback).
  const actionData = [
    ...HISTORICAL_ACTION_DATA,
    { sprint: "Sprint 24", assigned: currentActionCount || 5, completed: currentCompletedCount || 0 },
  ];

  // ----- Tag analytics ------------------------------------------------------

  // Tag Issue Frequency — count tag occurrences across "could_improve" cards in
  // the current sprint. Each card contributes to every tag it carries (multi-tag
  // aware), so tag counts may sum to more than the number of issue cards.
  const issueItems = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID, category: "could_improve" },
  });
  const issueTagCounts: Record<RetroTag, number> = {
    QA: 0, "Design Solution": 0, Spec: 0, Development: 0, Other: 0,
  };
  for (const item of issueItems) {
    for (const t of parseTags(item.tags)) issueTagCounts[t] += 1;
  }
  const totalIssueCards = issueItems.length;
  const tagIssueFrequency = (Object.entries(issueTagCounts) as [RetroTag, number][])
    .map(([tag, count]) => ({
      tag,
      count,
      // Percentage of *cards* (not of tag-totals) — can sum to >100% by design.
      percent: totalIssueCards > 0 ? Math.round((count / totalIssueCards) * 100) : 0,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  // Tag Trend Over Time — last 8 sprints (sprint-17 → sprint-24).
  // For the current sprint we derive real percentages from stored items. Past
  // sprints don't have item-level history yet, so we synthesize plausible
  // distributions that still trend toward the real current-sprint values. This
  // mirrors the existing pattern used for retroTrend/actionData above.
  const allCurrentItems = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
  });
  const currentTagShare: Record<RetroTag, number> = {
    QA: 0, "Design Solution": 0, Spec: 0, Development: 0, Other: 0,
  };
  for (const item of allCurrentItems) {
    for (const t of parseTags(item.tags)) currentTagShare[t] += 1;
  }
  const totalCurrentCards = allCurrentItems.length;
  const currentSprintPercents: Record<RetroTag, number> = {
    QA: 0, "Design Solution": 0, Spec: 0, Development: 0, Other: 0,
  };
  for (const t of RETRO_TAGS) {
    currentSprintPercents[t] =
      totalCurrentCards > 0 ? Math.round((currentTagShare[t] / totalCurrentCards) * 100) : 0;
  }

  // Historical distributions come from the shared seed record; Sprint 24
  // is computed above from live DB rows.
  const tagTrend = [
    ...HISTORICAL_TAG_TREND.map((row) => ({ sprint: row.sprint, ...row.values })),
    { sprint: "Sprint 24", ...currentSprintPercents },
  ];


  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={user.name}
        avatarColor={user.avatarColor}
        avatarUrl={user.avatarUrl}
        slackUserId={user.slackUserId}
        sprintLabel={sprintLabel}
      />
      <AnalyticsClient
        retroTrend={retroTrend}
        weeklyData={weeklyData}
        teamMembers={teamMembers}
        actionData={actionData}
        sprintLabel={sprintLabel}
        tagIssueFrequency={tagIssueFrequency}
        tagTrend={tagTrend}
        totalIssueCards={totalIssueCards}
      />
    </div>
  );
}
