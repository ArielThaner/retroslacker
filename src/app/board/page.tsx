import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { parseTags } from "@/lib/tag-classifier";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { BoardClient } from "./board-client";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const items = await prisma.retroItem.findMany({
    where: { userId: user.id, sprintId: SPRINT_ID },
    orderBy: { createdAt: "desc" },
  });

  const session = await prisma.retroSession.findFirst({
    where: { sprintId: SPRINT_ID },
  });

  const sprintLabel = getSprintLabel(SPRINT_ID);

  const wentWellItems = items.filter((i) => i.category === "went_well");
  const couldImproveItems = items.filter((i) => i.category === "could_improve");

  const allItems = items.map((i) => ({
    id: i.id,
    text: i.category === "went_well" ? i.wentWell : i.couldImprove,
    category: i.category,
    source: i.source,
    content: i.content,
    tags: parseTags(i.tags),
    week: i.week,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={user.name}
        avatarColor={user.avatarColor}
        avatarUrl={user.avatarUrl}
        slackUserId={user.slackUserId}
        sprintLabel={sprintLabel}
        sessionStatus={session?.status}
      />
      <BoardClient
        wentWellItems={wentWellItems.map((i) => ({
          id: i.id,
          text: i.wentWell,
          source: i.source,
          tags: parseTags(i.tags),
          week: i.week,
          createdAt: i.createdAt.toISOString(),
        }))}
        couldImproveItems={couldImproveItems.map((i) => ({
          id: i.id,
          text: i.couldImprove,
          source: i.source,
          tags: parseTags(i.tags),
          week: i.week,
          createdAt: i.createdAt.toISOString(),
        }))}
        allItems={allItems}
        sprintLabel={sprintLabel}
        sessionStatus={session?.status ?? "pending"}
      />
    </div>
  );
}
