import { after } from "next/server";
import {
  verifySlackSignature,
  type SlackPayload,
  type SlackMessageEvent,
  type SlackAppMentionEvent,
} from "@/lib/slack";
import { handleSlackMessage } from "@/lib/slack-handler";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // Log every hit to this endpoint regardless of signature so Railway
  // logs prove whether Slack is actually reaching us. Next.js prod
  // mode doesn't emit its own HTTP access log, so without this we
  // can't tell "Slack never called us" from "Slack called us but
  // signature verification 401'd".
  console.log(
    `[slack-events] POST received, ua=${request.headers.get("user-agent") ?? "?"}, sig-present=${Boolean(
      request.headers.get("x-slack-signature")
    )}, ts-present=${Boolean(request.headers.get("x-slack-request-timestamp"))}`
  );

  // Verify the request is from Slack
  const { valid, body } = await verifySlackSignature(request);
  if (!valid) {
    console.warn(
      "[slack-events] signature verification FAILED — rejecting with 401. Check SLACK_SIGNING_SECRET matches the Slack app's signing secret."
    );
    return new Response("Invalid signature", { status: 401 });
  }
  console.log("[slack-events] signature OK, body length", body.length);

  const payload = JSON.parse(body) as SlackPayload;

  // Handle URL verification challenge (one-time handshake during Slack app setup)
  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge });
  }

  // Handle event callbacks
  if (payload.type === "event_callback") {
    const event = payload.event;

    // Skip bot messages to prevent infinite loops
    if ("bot_id" in event && event.bot_id) {
      return new Response("OK", { status: 200 });
    }
    if ("subtype" in event && event.subtype) {
      return new Response("OK", { status: 200 });
    }

    // Handle DMs
    if (
      event.type === "message" &&
      (event as SlackMessageEvent).channel_type === "im"
    ) {
      const msgEvent = event as SlackMessageEvent;
      after(() =>
        handleSlackMessage(
          msgEvent.user,
          msgEvent.text,
          msgEvent.channel,
          msgEvent.ts
        )
      );
      return new Response("OK", { status: 200 });
    }

    // Handle @mentions in channels
    if (event.type === "app_mention") {
      const mentionEvent = event as SlackAppMentionEvent;
      // Strip the bot mention from the text (e.g., "<@U123> my reflection" → "my reflection")
      const cleanText = mentionEvent.text.replace(/<@[A-Z0-9]+>/g, "").trim();
      if (cleanText) {
        after(() =>
          handleSlackMessage(
            mentionEvent.user,
            cleanText,
            mentionEvent.channel,
            mentionEvent.ts
          )
        );
      }
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("OK", { status: 200 });
}
