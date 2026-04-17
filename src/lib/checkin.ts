import { prisma } from "./prisma";
import { slackClient } from "./slack";

export interface CheckinResult {
  name: string;
  success: boolean;
  error?: string;
}

/**
 * Send the weekly "Hey {firstName} 👋" DM prompt to every user whose
 * Slack account is linked. Shared by three triggers:
 *
 *  - `POST /api/slack/checkin` (cron-style, protected by SLACK_CHECKIN_SECRET)
 *  - `sendCheckinsNow()` server action (manual fire from Settings)
 *  - `scripts/send-checkins.ts`         (Railway Cron invocation)
 *
 * Per-user failures don't abort the batch — each is captured in the
 * returned results array so the caller can surface partial success.
 */
export async function sendCheckinsToLinkedUsers(): Promise<{
  sent: number;
  total: number;
  results: CheckinResult[];
}> {
  const users = await prisma.user.findMany({
    where: { slackUserId: { not: null } },
  });

  const results: CheckinResult[] = [];

  for (const user of users) {
    if (!user.slackUserId) continue;

    try {
      const conversation = await slackClient.conversations.open({
        users: user.slackUserId,
      });

      const channelId = conversation.channel?.id;
      if (!channelId) {
        results.push({
          name: user.name,
          success: false,
          error: "Could not open DM",
        });
        continue;
      }

      await slackClient.chat.postMessage({
        channel: channelId,
        text: `Hey ${user.name.split(" ")[0]} \uD83D\uDC4B How did your week go? Share a quick reflection and I'll add it to the retro board!`,
      });

      results.push({ name: user.name, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ name: user.name, success: false, error: message });
    }
  }

  const sent = results.filter((r) => r.success).length;
  return { sent, total: users.length, results };
}
