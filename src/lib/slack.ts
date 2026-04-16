import { WebClient } from "@slack/web-api";
import crypto from "crypto";

// --- Slack WebClient singleton ---

const globalForSlack = globalThis as unknown as { slackClient: WebClient };

export const slackClient =
  globalForSlack.slackClient ||
  new WebClient(process.env.SLACK_BOT_TOKEN || undefined);

if (process.env.NODE_ENV !== "production") globalForSlack.slackClient = slackClient;

// --- Signature verification ---

interface VerificationResult {
  valid: boolean;
  body: string;
}

export async function verifySlackSignature(
  request: Request
): Promise<VerificationResult> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return { valid: false, body: "" };
  }

  const body = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const slackSignature = request.headers.get("x-slack-signature");

  if (!timestamp || !slackSignature) {
    return { valid: false, body };
  }

  // Reject requests older than 5 minutes (replay attack protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return { valid: false, body };
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBasestring, "utf8")
      .digest("hex");

  const sigBuffer = Buffer.from(mySignature, "utf8");
  const slackSigBuffer = Buffer.from(slackSignature, "utf8");

  if (sigBuffer.length !== slackSigBuffer.length) {
    return { valid: false, body };
  }

  const valid = crypto.timingSafeEqual(sigBuffer, slackSigBuffer);
  return { valid, body };
}

// --- Slack event payload types ---

export interface SlackUrlVerificationPayload {
  type: "url_verification";
  challenge: string;
  token: string;
}

export interface SlackMessageEvent {
  type: "message";
  channel: string;
  user: string;
  text: string;
  ts: string;
  channel_type: "im" | "channel" | "group" | "mpim";
  bot_id?: string;
  subtype?: string;
}

export interface SlackAppMentionEvent {
  type: "app_mention";
  channel: string;
  user: string;
  text: string;
  ts: string;
  bot_id?: string;
}

export type SlackEvent = SlackMessageEvent | SlackAppMentionEvent;

export interface SlackEventCallbackPayload {
  type: "event_callback";
  token: string;
  team_id: string;
  event_id: string;
  event: SlackEvent;
}

export type SlackPayload =
  | SlackUrlVerificationPayload
  | SlackEventCallbackPayload;
