"use server";

import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsights, generateActionItems } from "@/lib/claude";
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

  const items = await prisma.retroItem.findMany({
    where: { sprintId: SPRINT_ID },
    include: { user: true },
  });

  const filtered = userName
    ? items.filter((item) => item.user.name === userName)
    : items;

  const itemsForAI = filtered.map((item) => ({
    userName: item.user.name,
    category: item.category,
    wentWell: item.wentWell,
    couldImprove: item.couldImprove,
  }));

  const insights = await generateInsights(itemsForAI);

  return {
    success: true,
    insights: {
      sentiment: insights.sentiment,
      synopsis: insights.synopsis,
      patterns: insights.patterns,
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

  await prisma.actionItem.update({
    where: { id: actionId },
    data: { assignedUserId: assignedUserId || null },
  });

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
