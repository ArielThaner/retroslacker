import { prisma } from "@/lib/prisma";
import { slackClient } from "@/lib/slack";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // Protect with a shared secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SLACK_CHECKIN_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Find all users with linked Slack accounts
  const users = await prisma.user.findMany({
    where: { slackUserId: { not: null } },
  });

  if (users.length === 0) {
    return Response.json({
      message: "No users with linked Slack accounts",
      sent: 0,
    });
  }

  const results: { name: string; success: boolean; error?: string }[] = [];

  for (const user of users) {
    if (!user.slackUserId) continue;

    try {
      // Open a DM conversation
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

      // Send the check-in prompt
      await slackClient.chat.postMessage({
        channel: channelId,
        text: `Hey ${user.name.split(" ")[0]} \uD83D\uDC4B How did your week go? Share a quick reflection and I'll add it to the retro board!`,
      });

      results.push({ name: user.name, success: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      results.push({ name: user.name, success: false, error: message });
    }
  }

  const sentCount = results.filter((r) => r.success).length;

  return Response.json({
    message: `Sent check-in to ${sentCount} of ${users.length} users`,
    sent: sentCount,
    results,
  });
}
