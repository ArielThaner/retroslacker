import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { parseTags } from "@/lib/tag-classifier";
import { RETRO_TAGS, type RetroTag } from "@/lib/tags";
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

  // Simulated per-person weekly sentiment data for the current sprint
  const weeklyData = [
    { week: "Week 1", "Amy Ng": 6, "Emily Hu": 7, "Sam Patel": 5, "Morgan Lee": 6, "Ariel Nichols": 7 },
    { week: "Week 2", "Amy Ng": 7, "Emily Hu": 6, "Sam Patel": 6, "Morgan Lee": 7, "Ariel Nichols": 8 },
    { week: "Week 3", "Amy Ng": 6, "Emily Hu": 7, "Sam Patel": 7, "Morgan Lee": 5, "Ariel Nichols": 7 },
    { week: "Week 4", "Amy Ng": 7, "Emily Hu": 8, "Sam Patel": 6, "Morgan Lee": 6, "Ariel Nichols": 6 },
  ];

  // Action items data per sprint (simulated historical + real current)
  const currentActionCount = await prisma.actionItem.count({
    where: { session: { sprintId: SPRINT_ID } },
  });
  const currentCompletedCount = await prisma.actionItem.count({
    where: { session: { sprintId: SPRINT_ID }, assignedUserId: { not: null } },
  });

  const actionData = [
    { sprint: "Sprint 20", assigned: 4, completed: 3 },
    { sprint: "Sprint 21", assigned: 5, completed: 4 },
    { sprint: "Sprint 22", assigned: 3, completed: 3 },
    { sprint: "Sprint 23", assigned: 5, completed: 2 },
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

  // Historical fake distributions (percent of cards carrying each tag — may
  // sum >100% because cards are multi-tagged).
  const historicalTrend: { sprint: string; values: Record<RetroTag, number> }[] = [
    { sprint: "Sprint 17", values: { Development: 55, QA: 30, Spec: 22, "Design Solution": 12, Other: 28 } },
    { sprint: "Sprint 18", values: { Development: 48, QA: 35, Spec: 18, "Design Solution": 15, Other: 30 } },
    { sprint: "Sprint 19", values: { Development: 60, QA: 25, Spec: 28, "Design Solution": 10, Other: 22 } },
    { sprint: "Sprint 20", values: { Development: 52, QA: 30, Spec: 25, "Design Solution": 18, Other: 26 } },
    { sprint: "Sprint 21", values: { Development: 58, QA: 28, Spec: 20, "Design Solution": 22, Other: 20 } },
    { sprint: "Sprint 22", values: { Development: 50, QA: 32, Spec: 24, "Design Solution": 20, Other: 18 } },
    { sprint: "Sprint 23", values: { Development: 45, QA: 38, Spec: 30, "Design Solution": 16, Other: 24 } },
  ];
  const tagTrend = [
    ...historicalTrend.map((row) => ({ sprint: row.sprint, ...row.values })),
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
        sessionStatus={currentSession?.status}
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
