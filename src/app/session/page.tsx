import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { SessionClient } from "./session-client";

export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const session = await prisma.retroSession.findFirst({
    where: { sprintId: SPRINT_ID },
    include: {
      actionItems: {
        include: { assignedUser: true },
      },
    },
  });

  if (!session || session.status === "pending") {
    redirect("/board");
  }

  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const allUsers = await prisma.user.findMany();

  const sprintLabel = getSprintLabel(SPRINT_ID);

  const wentWellItems = items
    .filter((i) => i.category === "went_well")
    .map((i) => ({
      id: i.id,
      text: i.wentWell,
      userName: i.user.name,
      avatarColor: i.user.avatarColor,
      avatarUrl: i.user.avatarUrl,
      jobTitle: i.user.jobTitle,
      source: i.source,
    }));

  const couldImproveItems = items
    .filter((i) => i.category === "could_improve")
    .map((i) => ({
      id: i.id,
      text: i.couldImprove,
      userName: i.user.name,
      avatarColor: i.user.avatarColor,
      avatarUrl: i.user.avatarUrl,
      jobTitle: i.user.jobTitle,
      source: i.source,
    }));

  const actionItemsData = session.actionItems.map((a) => ({
    id: a.id,
    description: a.description,
    assignedUserId: a.assignedUserId,
    assignedUserName: a.assignedUser?.name ?? null,
  }));

  const usersForAssign = allUsers.map((u) => ({ id: u.id, name: u.name }));

  const existingInsights = session.sentiment
    ? {
        sentiment: { score: parseInt(session.sentiment, 10) || 3, summary: "" },
        synopsis: session.synopsis ?? "",
        patterns: session.patterns ? (JSON.parse(session.patterns) as { title: string; mentions: number }[]) : [],
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={user.name}
        avatarColor={user.avatarColor}
        avatarUrl={user.avatarUrl}
        slackUserId={user.slackUserId}
        sprintLabel={sprintLabel}
        sessionStatus={session.status}
      />
      <SessionClient
        wentWellItems={wentWellItems}
        couldImproveItems={couldImproveItems}
        actionItems={actionItemsData}
        users={usersForAssign}
        sprintLabel={sprintLabel}
        sessionStatus={session.status}
        existingInsights={existingInsights}
      />
    </div>
  );
}
