"use server";

import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsights, generateActionItems } from "@/lib/claude";
import { slackClient } from "@/lib/slack";
import { revalidatePath } from "next/cache";

export async function fetchInsights() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
    include: { user: true },
  });

  const itemsForAI = items.map((item) => ({
    userName: item.user.name,
    category: item.category,
    wentWell: item.wentWell,
    couldImprove: item.couldImprove,
  }));

  const insights = await generateInsights(itemsForAI);

  const session = await prisma.retroSession.findUnique({
    where: { sprintId: SPRINT_ID },
  });

  if (session) {
    await prisma.retroSession.update({
      where: { id: session.id },
      data: {
        sentiment: String(insights.sentiment.score),
        synopsis: insights.synopsis,
        patterns: JSON.stringify(insights.patterns),
      },
    });
  }

  revalidatePath("/session");
  return {
    success: true,
    insights: {
      sentiment: insights.sentiment,
      synopsis: insights.synopsis,
      patterns: insights.patterns,
    },
  };
}

export async function fetchInsightsForUser(userName: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const allItems = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
    include: { user: true },
  });

  // Always generate patterns from ALL items so team-wide patterns are visible
  const allItemsForAI = allItems.map((item) => ({
    userName: item.user.name,
    category: item.category,
    wentWell: item.wentWell,
    couldImprove: item.couldImprove,
  }));

  const insights = await generateInsights(allItemsForAI);

  // If filtering by user, only show patterns where this user is a participant
  const filteredPatterns = userName
    ? insights.patterns.filter((p) =>
        p.relatedUsers.some((ru) => ru.toLowerCase().includes(userName.toLowerCase()) || userName.toLowerCase().includes(ru.toLowerCase()))
      )
    : insights.patterns;

  // Generate user-specific sentiment and synopsis if filtered
  let sentiment = insights.sentiment;
  let synopsis = insights.synopsis;

  if (userName) {
    const userItems = allItems.filter((item) => item.user.name === userName);
    const userItemsForAI = userItems.map((item) => ({
      userName: item.user.name,
      category: item.category,
      wentWell: item.wentWell,
      couldImprove: item.couldImprove,
    }));
    if (userItemsForAI.length > 0) {
      const userInsights = await generateInsights(userItemsForAI);
      sentiment = userInsights.sentiment;
      synopsis = userInsights.synopsis;
    }
  }

  return {
    success: true,
    insights: {
      sentiment,
      synopsis,
      patterns: filteredPatterns,
    },
  };
}

export async function fetchActionItems() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const session = await prisma.retroSession.findUnique({
    where: { sprintId: SPRINT_ID },
  });
  if (!session) return { error: "No session found" };

  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
    include: { user: true },
  });

  const rawPatterns = session.patterns ? JSON.parse(session.patterns) as { title: string; mentions: number; participants: number; sentiment: string }[] : [];
  const patterns = rawPatterns.map((p) => `${p.title} (${p.mentions} mentions, ${p.participants} participants)`);

  const itemsForAI = items.map((item) => ({
    userName: item.user.name,
    category: item.category,
    wentWell: item.wentWell,
    couldImprove: item.couldImprove,
  }));

  const actionItems = await generateActionItems(itemsForAI, patterns);

  // Save action items to DB
  for (const action of actionItems) {
    await prisma.actionItem.create({
      data: {
        sessionId: session.id,
        description: action.description,
      },
    });
  }

  revalidatePath("/session");
  return { success: true };
}

export async function assignActionItem(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const actionId = Number(formData.get("actionId"));
  const assignedUserId = Number(formData.get("userId"));
  if (!actionId) return { error: "Invalid action ID" };

  const actionItem = await prisma.actionItem.update({
    where: { id: actionId },
    data: { assignedUserId: assignedUserId || null },
  });

  // Send Slack DM to the assigned user
  if (assignedUserId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedUserId },
    });

    if (assignedUser?.slackUserId) {
      try {
        const conversation = await slackClient.conversations.open({
          users: assignedUser.slackUserId,
        });
        const channelId = conversation.channel?.id;
        if (channelId) {
          await slackClient.chat.postMessage({
            channel: channelId,
            text: `Hey ${assignedUser.name.split(" ")[0]} \uD83D\uDCCB You've been assigned a new action item from the retro:\n\n> ${actionItem.description}\n\nCheck it out in RetroSlacker!`,
          });
        }
      } catch {
        // Silently ignore Slack errors — assignment still succeeds
      }
    }
  }

  revalidatePath("/session");
  return { success: true };
}

export async function finalizeSession() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  await prisma.retroSession.update({
    where: { sprintId: SPRINT_ID },
    data: { status: "completed" },
  });

  revalidatePath("/session");
  revalidatePath("/board");
  return { success: true };
}

export async function toggleDiscussed(itemId: number) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const item = await prisma.retroItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };

  await prisma.retroItem.update({
    where: { id: itemId },
    data: { discussed: !item.discussed },
  });

  revalidatePath("/session");
  return { success: true };
}

export async function addItemAsAction(itemId: number) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const item = await prisma.retroItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found" };

  await prisma.retroItem.update({
    where: { id: itemId },
    data: { addedAsAction: true },
  });

  revalidatePath("/session");
  return { success: true };
}

export async function addPatternAsAction(patternTitle: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const session = await prisma.retroSession.findUnique({ where: { sprintId: SPRINT_ID } });
  if (!session) return { error: "No session" };

  // Find all retro items and mark those matching the pattern
  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID, addedAsAction: false },
    include: { user: true },
  });

  // Use the pattern's relatedItems from stored patterns to find matching items
  const patterns = session.patterns ? JSON.parse(session.patterns) as { title: string; relatedItems?: string[] }[] : [];
  const pattern = patterns.find((p) => p.title === patternTitle);
  const relatedTexts = pattern?.relatedItems ?? [];

  let marked = 0;
  for (const item of items) {
    const itemText = (item.category === "went_well" ? item.wentWell : item.couldImprove).toLowerCase();
    const isRelated = relatedTexts.some((rt: string) => {
      const rtLower = rt.toLowerCase();
      return itemText.includes(rtLower) || rtLower.includes(itemText);
    });
    if (isRelated) {
      await prisma.retroItem.update({ where: { id: item.id }, data: { addedAsAction: true } });
      marked++;
    }
  }

  revalidatePath("/session");
  return { success: true, marked };
}

export async function addAllPatternsAsActions() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const session = await prisma.retroSession.findUnique({ where: { sprintId: SPRINT_ID } });
  if (!session) return { error: "No session" };

  const patterns = session.patterns ? JSON.parse(session.patterns) as { title: string; relatedItems?: string[] }[] : [];
  const allRelatedTexts = patterns.flatMap((p) => p.relatedItems ?? []);

  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID, addedAsAction: false },
  });

  for (const item of items) {
    const itemText = (item.category === "went_well" ? item.wentWell : item.couldImprove).toLowerCase();
    const isRelated = allRelatedTexts.some((rt: string) => {
      const rtLower = rt.toLowerCase();
      return itemText.includes(rtLower) || rtLower.includes(itemText);
    });
    if (isRelated) {
      await prisma.retroItem.update({ where: { id: item.id }, data: { addedAsAction: true } });
    }
  }

  revalidatePath("/session");
  return { success: true };
}

export async function generateActionsFromItems() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const session = await prisma.retroSession.findUnique({ where: { sprintId: SPRINT_ID } });
  if (!session) return { error: "No session" };

  const addedItems = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID, addedAsAction: true },
    include: { user: true },
  });

  if (addedItems.length === 0) return { error: "No items have been added as actions" };

  const itemsForAI = addedItems.map((item) => ({
    userName: item.user.name,
    category: item.category,
    wentWell: item.wentWell,
    couldImprove: item.couldImprove,
  }));

  const rawPatterns = session.patterns ? JSON.parse(session.patterns) as { title: string; mentions: number }[] : [];
  const patternStrings = rawPatterns.map((p) => `${p.title} (${p.mentions} mentions)`);

  const actionItems = await generateActionItems(itemsForAI, patternStrings);

  for (const action of actionItems) {
    await prisma.actionItem.create({
      data: { sessionId: session.id, description: action.description },
    });
  }

  revalidatePath("/session");
  revalidatePath("/actions");
  return { success: true };
}

export async function updateActionStatus(actionId: number, status: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  await prisma.actionItem.update({
    where: { id: actionId },
    data: { status },
  });

  revalidatePath("/actions");
  return { success: true };
}

export async function deleteAction(actionId: number) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  await prisma.actionItem.delete({ where: { id: actionId } });

  revalidatePath("/actions");
  return { success: true };
}

// Re-home a past-retro action item onto the current sprint's session so it
// shows up under "This Retro" on the Actions page. Creates the current session
// if somehow missing. Status is reset to "active" since the user is
// re-committing to the work.
export async function moveActionToCurrentRetro(actionId: number) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  let currentSession = await prisma.retroSession.findUnique({
    where: { sprintId: SPRINT_ID },
  });
  if (!currentSession) {
    currentSession = await prisma.retroSession.create({
      data: { sprintId: SPRINT_ID, status: "pending" },
    });
  }

  const action = await prisma.actionItem.findUnique({ where: { id: actionId } });
  if (!action) return { error: "Action not found" };
  if (action.sessionId === currentSession.id) {
    return { success: true, alreadyCurrent: true };
  }

  await prisma.actionItem.update({
    where: { id: actionId },
    data: { sessionId: currentSession.id, status: "active" },
  });

  revalidatePath("/actions");
  return { success: true };
}
