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
  });

  // Only bounce if the session row is missing entirely. We used to also redirect
  // when status was "pending", but the nav now always exposes the Session link
  // (the Board shows a countdown + "Join Retro" button to activate the session),
  // so clicking Session should take the user there regardless of status.
  if (!session) {
    redirect("/home");
  }


  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

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
      discussed: i.discussed,
      addedAsAction: i.addedAsAction,
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
      discussed: i.discussed,
      addedAsAction: i.addedAsAction,
    }));

  const existingInsights = session.sentiment
    ? {
        sentiment: { score: parseInt(session.sentiment, 10) || 3, summary: "" },
        synopsis: session.synopsis ?? "",
        patterns: session.patterns ? (JSON.parse(session.patterns) as { title: string; mentions: number; participants: number; sentiment: "positive" | "negative"; relatedUsers: string[]; relatedItems: string[] }[]) : [],
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
      />
      <SessionClient
        wentWellItems={wentWellItems}
        couldImproveItems={couldImproveItems}
        sprintLabel={sprintLabel}
        sessionStatus={session.status}
        existingInsights={existingInsights}
      />
    </div>
  );
}
