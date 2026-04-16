import { prisma } from "./prisma";
import { slackClient } from "./slack";
import { parseReflection } from "./claude";
import { SPRINT_ID } from "./auth";

export async function handleSlackMessage(
  slackUserId: string,
  text: string,
  channel: string,
  threadTs: string
): Promise<void> {
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

  // Create RetroItem records
  const items: {
    userId: number;
    sprintId: string;
    content: string;
    wentWell: string;
    couldImprove: string;
    category: string;
    source: string;
  }[] = [];

  for (const item of parsed.went_well) {
    items.push({
      userId: user.id,
      sprintId: SPRINT_ID,
      content: text,
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
      content: text,
      wentWell: "",
      couldImprove: item,
      category: "could_improve",
      source: "slack",
    });
  }

  if (items.length > 0) {
    await prisma.retroItem.createMany({ data: items });
  }

  // Reply with confirmation
  const wellCount = parsed.went_well.length;
  const improveCount = parsed.could_improve.length;
  const total = wellCount + improveCount;

  await slackClient.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `Got it! I've added ${total} item${total === 1 ? "" : "s"} to your retro board \u2705\n\u2022 ${wellCount} went well\n\u2022 ${improveCount} could improve`,
  });

}
