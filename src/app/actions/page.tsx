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
    assignedUserId: number | null;
    assignedUser: { name: string; avatarColor: string; avatarUrl: string | null } | null;
  }): ActionRow {
    return {
      id: a.id,
      description: a.description,
      status: a.status,
      assignedUserId: a.assignedUserId,
      assignedUserName: a.assignedUser?.name ?? null,
      assignedUserColor: a.assignedUser?.avatarColor ?? null,
      assignedUserAvatarUrl: a.assignedUser?.avatarUrl ?? null,
    };
  }

  const currentActions = currentSession?.actionItems.map(mapAction) ?? [];
  const previousActions = previousSession?.actionItems.map(mapAction) ?? [];

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
