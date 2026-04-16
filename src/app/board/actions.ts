"use server";

import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReflection } from "@/lib/claude";
import { revalidatePath } from "next/cache";

export async function submitSlackMessage(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const message = formData.get("message") as string;
  if (!message?.trim()) return { error: "Message is required" };

  const parsed = await parseReflection(message.trim());

  const items: { userId: number; sprintId: string; content: string; wentWell: string; couldImprove: string; category: string; source: string }[] = [];

  for (const item of parsed.went_well) {
    items.push({
      userId: user.id,
      sprintId: SPRINT_ID,
      content: message.trim(),
      wentWell: item,
      couldImprove: "",
      category: "went_well",
      source: "slack",
    });
  }

  for (const item of parsed.could_improve) {
    items.push({
      userId: user.id,
      sprintId: SPRINT_ID,
      content: message.trim(),
      wentWell: "",
      couldImprove: item,
      category: "could_improve",
      source: "slack",
    });
  }

  if (items.length > 0) {
    await prisma.retroItem.createMany({ data: items });
  }

  revalidatePath("/board");
  return { success: true, itemCount: items.length };
}

export async function addRetroItem(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const text = formData.get("text") as string;
  const category = formData.get("category") as string;
  if (!text?.trim() || !category) return { error: "Text and category required" };

  await prisma.retroItem.create({
    data: {
      userId: user.id,
      sprintId: SPRINT_ID,
      content: text.trim(),
      wentWell: category === "went_well" ? text.trim() : "",
      couldImprove: category === "could_improve" ? text.trim() : "",
      category,
      source: "manual",
    },
  });

  revalidatePath("/board");
  return { success: true };
}

export async function updateRetroItem(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const id = Number(formData.get("id"));
  const text = formData.get("text") as string;
  if (!id || !text?.trim()) return { error: "Invalid input" };

  const item = await prisma.retroItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return { error: "Not authorized" };

  await prisma.retroItem.update({
    where: { id },
    data: {
      wentWell: item.category === "went_well" ? text.trim() : item.wentWell,
      couldImprove: item.category === "could_improve" ? text.trim() : item.couldImprove,
    },
  });

  revalidatePath("/board");
  return { success: true };
}

export async function deleteRetroItem(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const id = Number(formData.get("id"));
  if (!id) return { error: "Invalid ID" };

  const item = await prisma.retroItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return { error: "Not authorized" };

  await prisma.retroItem.delete({ where: { id } });

  revalidatePath("/board");
  return { success: true };
}

export async function linkSlackUser(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const slackUserId = formData.get("slackUserId") as string;
  if (!slackUserId?.trim()) return { error: "Slack User ID is required" };

  const trimmed = slackUserId.trim().toUpperCase();

  // Validate format (Slack user IDs start with U or W and are alphanumeric)
  if (!/^[UW][A-Z0-9]{8,}$/.test(trimmed)) {
    return { error: "Invalid Slack User ID format. It should look like U0123ABCDEF" };
  }

  // Check if already linked to another user
  const existing = await prisma.user.findUnique({
    where: { slackUserId: trimmed },
  });
  if (existing && existing.id !== user.id) {
    return { error: "This Slack account is already linked to another user" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { slackUserId: trimmed },
  });

  revalidatePath("/board");
  return { success: true };
}

export async function unlinkSlackUser() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  await prisma.user.update({
    where: { id: user.id },
    data: { slackUserId: null },
  });

  revalidatePath("/board");
  return { success: true };
}

export async function toggleReady(formData: FormData) {
  // Simple toggle using a cookie-like approach since we don't have a ready field
  // For demo, we'll track readiness in the session model or use a simpler approach
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const isReady = formData.get("isReady") === "true";
  // We'll store readiness in localStorage on the client side for demo
  revalidatePath("/board");
  return { success: true, isReady };
}

export async function startSession() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const session = await prisma.retroSession.findUnique({
    where: { sprintId: SPRINT_ID },
  });

  if (!session) {
    await prisma.retroSession.create({
      data: { sprintId: SPRINT_ID, status: "active" },
    });
  } else {
    await prisma.retroSession.update({
      where: { id: session.id },
      data: { status: "active" },
    });
  }

  revalidatePath("/board");
  revalidatePath("/session");
  return { success: true };
}
