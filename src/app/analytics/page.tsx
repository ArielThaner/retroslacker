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
        sprintLabel={sprintLabel}
      />
    </div>
  );
}
