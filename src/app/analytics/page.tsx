import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const sprintLabel = getSprintLabel(SPRINT_ID);

  // Fetch all retro sessions ordered by creation date
  const sessions = await prisma.retroSession.findMany({
    orderBy: { createdAt: "asc" },
  });

  const currentSession = sessions.find((s) => s.sprintId === SPRINT_ID);

  // Build retro-over-retro sentiment data
  const retroTrend = sessions
    .filter((s) => s.sentiment)
    .map((s) => ({
      sprint: s.sprintId.replace("sprint-", "Sprint "),
      sentiment: parseInt(s.sentiment ?? "0", 10),
      isCurrent: s.sprintId === SPRINT_ID,
    }));

  // Build weekly sentiment data for current sprint (simulated from historical seed data)
  // In a real app this would come from weekly check-in data
  const weeklyData = [
    { week: "Week 1", currentSprint: 6, average: 5.5 },
    { week: "Week 2", currentSprint: 7, average: 6 },
    { week: "Week 3", currentSprint: 6, average: 5.8 },
    { week: "Week 4", currentSprint: currentSession?.sentiment ? parseInt(currentSession.sentiment, 10) : 7, average: 6.2 },
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
        sprintLabel={sprintLabel}
      />
    </div>
  );
}
