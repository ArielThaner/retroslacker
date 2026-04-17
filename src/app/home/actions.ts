"use server";

import { getSessionUser, SPRINT_ID } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReflection } from "@/lib/claude";
import { slackClient, formatSlackError } from "@/lib/slack";
import { sendCheckinsToLinkedUsers } from "@/lib/checkin";
import { DEFAULT_RETRO_TAG, isRetroTag, type RetroTag } from "@/lib/tags";
import { autoTagRetroItem, parseTags, serializeTags } from "@/lib/tag-classifier";
import {
  SEED_USERS,
  SEED_RETRO_GROUPS,
  SEED_HISTORICAL_SESSIONS,
  SEED_ACTION_ITEMS,
  SEED_ACTION_RELATED_COUNTS,
  SPRINT_WEEK_START_ISO,
  PREVIOUS_SPRINT_ID,
} from "@/lib/seed-data";
import { revalidatePath } from "next/cache";

export async function submitSlackMessage(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const message = formData.get("message") as string;
  if (!message?.trim()) return { error: "Message is required" };

  const parsed = await parseReflection(message.trim());

  const items: {
    userId: number;
    sprintId: string;
    content: string;
    wentWell: string;
    couldImprove: string;
    category: string;
    source: string;
    tag: string;
    tags: string;
  }[] = [];

  for (const item of parsed.went_well) {
    const autoTags = autoTagRetroItem(item);
    items.push({
      userId: user.id,
      sprintId: SPRINT_ID,
      content: message.trim(),
      wentWell: item,
      couldImprove: "",
      category: "went_well",
      source: "slack",
      tag: autoTags[0],
      tags: serializeTags(autoTags),
    });
  }

  for (const item of parsed.could_improve) {
    const autoTags = autoTagRetroItem(item);
    items.push({
      userId: user.id,
      sprintId: SPRINT_ID,
      content: message.trim(),
      wentWell: "",
      couldImprove: item,
      category: "could_improve",
      source: "slack",
      tag: autoTags[0],
      tags: serializeTags(autoTags),
    });
  }

  if (items.length > 0) {
    await prisma.retroItem.createMany({ data: items });
  }

  revalidatePath("/home");
  return {
    success: true,
    itemCount: items.length,
    wentWellCount: parsed.went_well.length,
    couldImproveCount: parsed.could_improve.length,
    wentWell: parsed.went_well,
    couldImprove: parsed.could_improve,
  };
}

export async function addRetroItem(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const text = formData.get("text") as string;
  const category = formData.get("category") as string;
  if (!text?.trim() || !category) return { error: "Text and category required" };

  // The client sends a JSON-encoded tag array (multi-select picker). Fall back
  // to the legacy single-tag field and then to the default so older clients
  // still work. Combine with auto-detected tags so manual items get the same
  // enrichment as Slack items.
  let chosenTags: RetroTag[] = [];
  const rawTags = formData.get("tags") as string | null;
  if (rawTags) {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) {
        chosenTags = parsed.filter((t): t is RetroTag => typeof t === "string" && isRetroTag(t));
      }
    } catch {
      // fallthrough to single-tag field below
    }
  }
  if (chosenTags.length === 0) {
    const rawTag = (formData.get("tag") as string | null)?.trim() ?? "";
    chosenTags = [isRetroTag(rawTag) ? rawTag : DEFAULT_RETRO_TAG];
  }

  const auto = autoTagRetroItem(text.trim());
  const tagSet: RetroTag[] = Array.from(new Set<RetroTag>([...chosenTags, ...auto]));

  // Week is always 4 for new manual items — the sprint is in its final week
  // by the time anyone types something directly. Schema default covers it,
  // but we set it explicitly for clarity.
  await prisma.retroItem.create({
    data: {
      userId: user.id,
      sprintId: SPRINT_ID,
      content: text.trim(),
      wentWell: category === "went_well" ? text.trim() : "",
      couldImprove: category === "could_improve" ? text.trim() : "",
      category,
      source: "manual",
      tag: chosenTags[0],
      tags: serializeTags(tagSet),
      week: 4,
    },
  });

  revalidatePath("/home");
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

  revalidatePath("/home");
  return { success: true };
}

export async function addTagToItem(itemId: number, tag: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  if (!isRetroTag(tag)) return { error: "Invalid tag" };

  const item = await prisma.retroItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== user.id) return { error: "Not authorized" };

  const existing = parseTags(item.tags);
  if (existing.includes(tag)) {
    return { success: true, tags: existing };
  }
  const next = [...existing, tag];

  await prisma.retroItem.update({
    where: { id: itemId },
    data: { tags: serializeTags(next) },
  });

  revalidatePath("/home");
  return { success: true, tags: next };
}

export async function removeTagFromItem(itemId: number, tag: string) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const item = await prisma.retroItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== user.id) return { error: "Not authorized" };

  const existing = parseTags(item.tags);
  const next = existing.filter((t) => t !== tag);
  // Never leave an item untagged — fall back to "Other" if the user clears every tag.
  const final: RetroTag[] = next.length > 0 ? next : ["Other"];

  await prisma.retroItem.update({
    where: { id: itemId },
    data: { tags: serializeTags(final) },
  });

  revalidatePath("/home");
  return { success: true, tags: final };
}

export async function deleteRetroItem(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const id = Number(formData.get("id"));
  if (!id) return { error: "Invalid ID" };

  const item = await prisma.retroItem.findUnique({ where: { id } });
  if (!item || item.userId !== user.id) return { error: "Not authorized" };

  await prisma.retroItem.delete({ where: { id } });

  revalidatePath("/home");
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

  revalidatePath("/home");
  return { success: true };
}

export async function unlinkSlackUser() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  await prisma.user.update({
    where: { id: user.id },
    data: { slackUserId: null },
  });

  revalidatePath("/home");
  return { success: true };
}

export async function toggleReady(formData: FormData) {
  // Simple toggle using a cookie-like approach since we don't have a ready field
  // For demo, we'll track readiness in the session model or use a simpler approach
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const isReady = formData.get("isReady") === "true";
  // We'll store readiness in localStorage on the client side for demo
  revalidatePath("/home");
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

  revalidatePath("/home");
  revalidatePath("/session");
  return { success: true };
}

/**
 * Admin action: delete every message the Slack bot has posted across
 * every conversation it's a member of (DMs, MPIMs, public/private
 * channels). `chat.delete` only works on the bot's own messages, so
 * user messages are safe. Individual delete failures (already-deleted,
 * too-old, permissions) are counted as `skipped` and do not abort the
 * rest of the run.
 */
export async function deleteAllBotMessages() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  let botUserId: string;
  try {
    const authTest = await slackClient.auth.test();
    botUserId = authTest.user_id as string;
    if (!botUserId) return { error: "Couldn't identify bot user id" };
  } catch (err) {
    return { error: `Slack auth failed: ${formatSlackError(err)}` };
  }

  let deleted = 0;
  let skipped = 0;
  const missingScopes = new Set<string>();
  const warnings: string[] = [];
  const channelIds = new Set<string>();
  // Map of channel id → display name for channels we explicitly resolved
  // by name. Lets us surface per-channel problems (e.g. "not_in_channel")
  // with a recognizable label instead of just a Slack id.
  const namedChannels = new Map<string, string>();

  // Workspace-wide channels the bot should always try to clean up —
  // even if the bot isn't returned by `users.conversations` for them
  // (e.g. #all-retroteam, a default workspace channel). Resolved by
  // name (case-insensitive) via `conversations.list`, then we attempt
  // to join before reading history so the bot has permission.
  const ALWAYS_INCLUDE_CHANNELS = ["all-retroteam"];
  try {
    let listCursor: string | undefined;
    const needed = new Set(ALWAYS_INCLUDE_CHANNELS.map((n) => n.toLowerCase()));
    do {
      const list = await slackClient.conversations.list({
        types: "public_channel",
        exclude_archived: true,
        cursor: listCursor,
        limit: 200,
      });
      for (const c of list.channels ?? []) {
        const name = c.name?.toLowerCase();
        if (name && needed.has(name) && c.id) {
          channelIds.add(c.id);
          namedChannels.set(c.id, `#${c.name}`);
          needed.delete(name);
        }
      }
      if (needed.size === 0) break;
      listCursor = list.response_metadata?.next_cursor || undefined;
    } while (listCursor);
    if (needed.size === ALWAYS_INCLUDE_CHANNELS.length) {
      // None of the target names were found in the workspace.
      warnings.push(
        `Couldn't find any of ${ALWAYS_INCLUDE_CHANNELS.map((n) => `#${n}`).join(" or ")} in this workspace.`
      );
    }
  } catch (err) {
    const data = (err as { data?: { error?: string; needed?: string } }).data;
    if (data?.error === "missing_scope" && data.needed) {
      data.needed.split(",").forEach((s) => missingScopes.add(s.trim()));
    } else {
      warnings.push(`Couldn't list workspace channels: ${formatSlackError(err)}`);
    }
    // Non-fatal — fall through to the per-member enumeration below.
  }

  // Best-effort: join the explicitly-resolved channels so
  // `conversations.history` / `chat.delete` have permission. Silently
  // ignore errors (may already be a member, may lack `channels:join`
  // scope — the history loop will surface a clearer error if needed).
  for (const [id, label] of namedChannels) {
    try {
      await slackClient.conversations.join({ channel: id });
    } catch (err) {
      const data = (err as { data?: { error?: string; needed?: string } }).data;
      if (data?.error === "missing_scope" && data.needed) {
        data.needed.split(",").forEach((s) => missingScopes.add(s.trim()));
        warnings.push(
          `Couldn't auto-join ${label} (missing scope). Invite the bot manually with \`/invite\`.`
        );
      }
      // Other errors (already_in_channel, is_archived, etc.) are fine.
    }
  }

  // Enumerate conversations one type at a time so a missing scope on
  // one type (commonly `mpim:read`) doesn't abort the whole cleanup.
  // Each type maps to its own Slack scope, and we'd rather still
  // clean up DMs/public channels than fail outright.

  const CONV_TYPES = ["im", "public_channel", "private_channel", "mpim"] as const;
  for (const type of CONV_TYPES) {
    let convCursor: string | undefined;
    try {
      do {
        const convs = await slackClient.users.conversations({
          user: botUserId,
          types: type,
          cursor: convCursor,
          limit: 200,
        });
        for (const conv of convs.channels ?? []) {
          if (conv.id) channelIds.add(conv.id);
        }
        convCursor = convs.response_metadata?.next_cursor || undefined;
      } while (convCursor);
    } catch (err) {
      const data = (err as { data?: { error?: string; needed?: string } }).data;
      if (data?.error === "missing_scope" && data.needed) {
        data.needed.split(",").forEach((s) => missingScopes.add(s.trim()));
        continue; // skip this type, keep enumerating the others
      }
      return {
        error: `Slack cleanup failed: ${formatSlackError(err)}`,
        deleted,
        skipped,
      };
    }
  }

  for (const channel of channelIds) {
    let histCursor: string | undefined;
    try {
      do {
        const history = await slackClient.conversations.history({
          channel,
          cursor: histCursor,
          limit: 200,
        });
        for (const msg of history.messages ?? []) {
          const mine = msg.user === botUserId || Boolean(msg.bot_id);
          if (!mine || !msg.ts) continue;
          try {
            await slackClient.chat.delete({ channel, ts: msg.ts });
            deleted += 1;
          } catch {
            // Swallow per-message failures — a stale ts or a message the
            // bot no longer has permission to delete shouldn't stop
            // cleanup of the rest.
            skipped += 1;
          }
        }
        histCursor = history.response_metadata?.next_cursor || undefined;
      } while (histCursor);
    } catch (err) {
      const data = (err as { data?: { error?: string; needed?: string } }).data;
      const label = namedChannels.get(channel) ?? channel;
      if (data?.error === "missing_scope" && data.needed) {
        data.needed.split(",").forEach((s) => missingScopes.add(s.trim()));
        if (namedChannels.has(channel)) {
          warnings.push(`${label}: missing scope (${data.needed}).`);
        }
        continue;
      }
      // Surface the error for named channels so the user knows *why*
      // #all-retro wasn't cleaned. Anonymous channels (enumerated via
      // users.conversations) get counted as skipped and stay quiet.
      if (namedChannels.has(channel)) {
        warnings.push(`${label}: ${data?.error ?? formatSlackError(err)}.`);
      } else {
        skipped += 1;
      }
    }
  }

  return {
    success: true,
    deleted,
    skipped,
    missingScopes: missingScopes.size > 0 ? Array.from(missingScopes) : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Manual trigger for the weekly Slack check-in prompt. Invoked by the
 * "Send check-in now" button in Settings. Shares its implementation
 * with the cron endpoint and `scripts/send-checkins.ts` via
 * `sendCheckinsToLinkedUsers`.
 */
export async function sendCheckinsNow() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const { sent, total, results } = await sendCheckinsToLinkedUsers();
    const firstError = results.find((r) => !r.success)?.error;
    return {
      success: true as const,
      sent,
      total,
      firstError,
    };
  } catch (err) {
    return {
      error: `Check-in failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Wipe all demo-data tables (ActionItem, RetroItem, RetroSession) and
 * replay the canonical seed from `@/lib/seed-data`. Users are preserved
 * (so the signed-in session survives and Slack links aren't lost), but
 * any User fields that drift from the seed — name, avatar, job title —
 * are upserted back to the seed values.
 *
 * Intended for the "Reset experience" button in the Settings modal. Wrapped
 * in a single Prisma transaction so a mid-reset failure can't leave the DB
 * with half-seeded data.
 */
export async function resetExperience() {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Wipe demo data in FK-safe order.
      await tx.actionItem.deleteMany({});
      await tx.retroItem.deleteMany({});
      await tx.retroSession.deleteMany({});

      // 2. Upsert canonical users. Preserves `id` (so auth cookies keep
      //    working) and preserves slack link + password on existing rows;
      //    for any missing users, create them fresh from seed.
      for (const u of SEED_USERS) {
        await tx.user.upsert({
          where: { username: u.username },
          update: {
            name: u.name,
            avatarColor: u.avatarColor,
            avatarUrl: u.avatarUrl,
            jobTitle: u.jobTitle,
          },
          create: {
            username: u.username,
            name: u.name,
            password: u.password,
            avatarColor: u.avatarColor,
            avatarUrl: u.avatarUrl,
            jobTitle: u.jobTitle,
          },
        });
      }

      // Lookup table: username -> user id, needed for the inserts below.
      const users = await tx.user.findMany({
        where: { username: { in: SEED_USERS.map((u) => u.username) } },
      });
      const userIdByUsername = new Map(users.map((u) => [u.username, u.id]));

      // 3. Current sprint session (pending) + retro items.
      const currentSession = await tx.retroSession.create({
        data: { sprintId: SPRINT_ID, status: "pending", createdAt: new Date() },
      });
      // `currentSession` is created but not used directly below — the
      // retro items reference `sprintId`, not `sessionId`.
      void currentSession;

      for (const group of SEED_RETRO_GROUPS) {
        const uid = userIdByUsername.get(group.username);
        if (!uid) continue;
        const createdAt = new Date(SPRINT_WEEK_START_ISO[group.week]);
        for (const item of group.items) {
          const autoTags = autoTagRetroItem(item.text);
          const merged = Array.from(new Set<RetroTag>([item.tag, ...autoTags]));
          await tx.retroItem.create({
            data: {
              userId: uid,
              sprintId: SPRINT_ID,
              content: group.message,
              wentWell: item.category === "went_well" ? item.text : "",
              couldImprove: item.category === "could_improve" ? item.text : "",
              category: item.category,
              source: group.source,
              tag: item.tag,
              tags: serializeTags(merged),
              week: group.week,
              createdAt,
              updatedAt: createdAt,
            },
          });
        }
      }

      // 4. Historical sessions (completed, with sentiment/synopsis).
      for (const s of SEED_HISTORICAL_SESSIONS) {
        await tx.retroSession.create({
          data: {
            sprintId: s.sprintId,
            status: "completed",
            sentiment: s.sentiment,
            synopsis: s.synopsis,
            createdAt: new Date(s.createdAt),
          },
        });
      }

      // 5. Seeded ActionItems for the previous sprint, per user. Each
      //    action links to up to N retro items the user authored (falls
      //    back to any retro items if the user has none) so the card's
      //    "Associated retro items" count has something to display.
      const prevSession = await tx.retroSession.findUnique({
        where: { sprintId: PREVIOUS_SPRINT_ID },
      });
      if (prevSession) {
        for (const [username, seeds] of Object.entries(SEED_ACTION_ITEMS)) {
          const uid = userIdByUsername.get(username);
          if (!uid) continue;

          const ownItems = await tx.retroItem.findMany({
            where: { userId: uid },
            take: 10,
            select: { id: true },
          });
          const fallback =
            ownItems.length > 0
              ? ownItems
              : await tx.retroItem.findMany({ take: 10, select: { id: true } });
          const ids = fallback.map((r) => r.id);

          for (let i = 0; i < seeds.length; i++) {
            const a = seeds[i];
            const count = SEED_ACTION_RELATED_COUNTS[i] ?? 2;
            const related = JSON.stringify(ids.slice(0, Math.min(count, ids.length)));
            await tx.actionItem.create({
              data: {
                sessionId: prevSession.id,
                description: a.description,
                assignedUserId: uid,
                status: a.status,
                relatedRetroItemIds: related,
                createdAt: new Date(),
              },
            });
          }
        }
      }
    }, { timeout: 30_000 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Reset failed: ${message}` };
  }

  revalidatePath("/home");
  revalidatePath("/session");
  revalidatePath("/actions");
  revalidatePath("/analytics");
  return { success: true };
}
