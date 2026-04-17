import { prisma } from "./prisma";
import { slackClient } from "./slack";
import { parseReflection } from "./claude";
import { SPRINT_ID } from "./auth";
import { autoTagRetroItem, serializeTags } from "./tag-classifier";

export async function handleSlackMessage(
  slackUserId: string,
  text: string,
  channel: string,
  threadTs: string
): Promise<void> {
  console.log(
    `[slack-handler] incoming message from ${slackUserId} in ${channel} (ts=${threadTs}), text=${JSON.stringify(
      text.slice(0, 120)
    )}`
  );

  // Look up user by Slack ID
  const user = await prisma.user.findUnique({
    where: { slackUserId },
  });

  if (!user) {
    await slackClient.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `I don't recognize your Slack account yet. Please link it in RetroSlacker:\n1. Log in to RetroSlacker\n2. Go to your Board\n3. Click "Link Slack Account" and enter your Slack User ID: \`${slackUserId}\``,
    });
    return;
  }

  // Parse the reflection with Claude AI
  let parsed: { went_well: string[]; could_improve: string[] };
  try {
    parsed = await parseReflection(text);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during parsing";
    await slackClient.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `Sorry, I had trouble parsing your reflection. Please try again.\nError: ${message}`,
    });
    return;
  }

  // Create RetroItem records. Every item is auto-tagged by the keyword
  // classifier so incoming Slack-sourced items match the taxonomy applied
  // everywhere else in the app.
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
      content: text,
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
      content: text,
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

  // Reply with a full breakdown: count header plus each parsed item
  // listed under its category. Wrapped in try/catch + console so a
  // failed postMessage doesn't silently vanish in `after()` — the
  // error shows up in Railway logs where it can be diagnosed.
  const wellCount = parsed.went_well.length;
  const improveCount = parsed.could_improve.length;
  const total = wellCount + improveCount;

  const lines: string[] = [
    `Got it! I've added ${total} item${total === 1 ? "" : "s"} to your retro board \u2705`,
  ];
  if (parsed.went_well.length > 0) {
    lines.push("");
    lines.push("*Went well:*");
    for (const w of parsed.went_well) lines.push(`\u2022 ${w}`);
  }
  if (parsed.could_improve.length > 0) {
    lines.push("");
    lines.push("*Could improve:*");
    for (const c of parsed.could_improve) lines.push(`\u2022 ${c}`);
  }

  try {
    await slackClient.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error(
      "[slack-handler] chat.postMessage (summary) failed:",
      err instanceof Error ? err.message : err,
      (err as { data?: unknown }).data
    );
  }
}
