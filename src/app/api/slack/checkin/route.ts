import { sendCheckinsToLinkedUsers } from "@/lib/checkin";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // Protect with a shared secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SLACK_CHECKIN_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sent, total, results } = await sendCheckinsToLinkedUsers();

  if (total === 0) {
    return Response.json({
      message: "No users with linked Slack accounts",
      sent: 0,
    });
  }

  return Response.json({
    message: `Sent check-in to ${sent} of ${total} users`,
    sent,
    results,
  });
}
