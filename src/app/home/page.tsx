import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { parseTags } from "@/lib/tag-classifier";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { BoardClient } from "./board-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const items = await prisma.retroItem.findMany({
    where: { userId: user.id, sprintId: SPRINT_ID },
    orderBy: { createdAt: "desc" },
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

  // "My Actions" section — action items assigned to the signed-in user
  // from the most recently *closed* retro session. Using status rather
  // than "any session except the current one" means that when the user
  // closes the current sprint (via /actions → /retro-complete → Return
  // to Home), the freshly-assigned follow-ups for that sprint replace
  // the previously-shown seed data from the prior closed sprint —
  // exactly the behavior we want post-close.
  const previousSession = await prisma.retroSession.findFirst({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
    include: {
      actionItems: {
        where: { assignedUserId: user.id },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  // Cap the Home dashboard to a small, deterministic slice per user so
  // the card grid never feels overwhelming. Each user reliably sees the
  // same counts across reloads (seeded off their user id):
  //   • 3 or 4 active actions
  //   • 0 or 1 completed ("undo") action
  const rawActions = previousSession?.actionItems ?? [];
  const activeActions = rawActions.filter((a) => a.status !== "completed");
  const completedActions = rawActions.filter((a) => a.status === "completed");
  // Deterministic pseudo-random picker — stable across reloads for a
  // given (seed, min, max) tuple, no Math.random call required.
  const pickCount = (seed: number, min: number, max: number) => {
    const r = Math.abs(Math.sin(seed) * 10000);
    return min + Math.floor((r - Math.floor(r)) * (max - min + 1));
  };
  const activeTake = pickCount(user.id * 7 + 1, 3, 4);
  const completedTake = pickCount(user.id * 7 + 2, 0, 1);
  const trimmedActions = [
    ...activeActions.slice(0, activeTake),
    ...completedActions.slice(0, completedTake),
  ];

  const myPreviousActions = trimmedActions.map((a) => {
    // `relatedRetroItemIds` is a JSON-encoded number[] — we only need the
    // count for the dashboard card today, so we parse + length-check here
    // and send just the number to the client.
    let relatedCount = 0;
    if (a.relatedRetroItemIds) {
      try {
        const parsed = JSON.parse(a.relatedRetroItemIds);
        if (Array.isArray(parsed)) relatedCount = parsed.length;
      } catch {
        // malformed JSON — treat as zero rather than crashing render
      }
    }
    return {
      id: a.id,
      description: a.description,
      status: a.status,
      note: a.note ?? "",
      relatedCount,
    };
  });
  const previousSprintLabel = previousSession
    ? getSprintLabel(previousSession.sprintId)
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
        myPreviousActions={myPreviousActions}
        previousSprintLabel={previousSprintLabel}
        userName={user.name}
        userJobTitle={user.jobTitle ?? ""}
        userAvatarColor={user.avatarColor}
        userAvatarUrl={user.avatarUrl}
      />
    </div>
  );
}
