import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSprintLabel } from "@/lib/utils";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { ActionsClient, type ActionRow } from "./actions-client";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const sprintLabel = getSprintLabel(SPRINT_ID);

  // Load every session with its action items + assignees, most recent first.
  // The current sprint's session is the "This Retro" list; the next-most-recent
  // session that has any action items is the "Previous Retro" list.
  const sessions = await prisma.retroSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      actionItems: {
        include: { assignedUser: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const currentSession = sessions.find((s) => s.sprintId === SPRINT_ID) ?? null;
  const previousSession =
    sessions.find((s) => s.sprintId !== SPRINT_ID && s.actionItems.length > 0) ?? null;

  const allUsers = await prisma.user.findMany();
  const users = allUsers.map((u) => ({ id: u.id, name: u.name }));

  function mapAction(a: {
    id: number;
    description: string;
    status: string;
    note: string | null;
    relatedRetroItemIds: string | null;
    assignedUserId: number | null;
    assignedUser: { name: string; avatarColor: string; avatarUrl: string | null; jobTitle: string } | null;
  }): ActionRow {
    // relatedRetroItemIds is stored as a JSON-encoded string ("[1,2,3]").
    // We only surface the count to the client — the actual id list is not
    // used here. Tolerate malformed / missing values by defaulting to 0.
    let relatedCount = 0;
    if (a.relatedRetroItemIds) {
      try {
        const ids = JSON.parse(a.relatedRetroItemIds);
        if (Array.isArray(ids)) relatedCount = ids.length;
      } catch {
        // leave as 0
      }
    }
    return {
      id: a.id,
      description: a.description,
      status: a.status,
      note: a.note ?? "",
      relatedCount,
      assignedUserId: a.assignedUserId,
      assignedUserName: a.assignedUser?.name ?? null,
      assignedUserJobTitle: a.assignedUser?.jobTitle ?? null,
      assignedUserColor: a.assignedUser?.avatarColor ?? null,
      assignedUserAvatarUrl: a.assignedUser?.avatarUrl ?? null,
    };
  }

  const currentActions = currentSession?.actionItems.map(mapAction) ?? [];
  // The Previous Retro column is a look-back summary, not an exhaustive
  // log — we cap it at 5 so the page stays focused on what's actionable
  // right now ("This Retro" below). Seed data has many more per sprint;
  // the rest are still queryable elsewhere if needed.
  const previousActions = (previousSession?.actionItems ?? []).slice(0, 5).map(mapAction);


  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={user.name}
        avatarColor={user.avatarColor}
        avatarUrl={user.avatarUrl}
        slackUserId={user.slackUserId}
        sprintLabel={sprintLabel}
      />
      <ActionsClient
        currentActions={currentActions}
        previousActions={previousActions}
        previousSprintLabel={
          previousSession
            ? getSprintLabel(previousSession.sprintId)
            : null
        }
        currentSprintLabel={sprintLabel}
        users={users}
      />
    </div>
  );
}
