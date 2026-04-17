/**
 * Railway Cron entrypoint. Sends the weekly "Hey {firstName} 👋"
 * Slack DM to every user with a linked Slack account.
 *
 * Configure in Railway:
 *   1. In your project, add a new "Cron" service (or reuse the app
 *      service with a Cron Schedule).
 *   2. Command: `npx tsx scripts/send-checkins.ts`
 *   3. Schedule (UTC): e.g. `0 22 * * 5` = Fridays 3pm PT.
 *   4. Env: the cron service needs the same SLACK_BOT_TOKEN and
 *      DATABASE_URL as the web service.
 *
 * Exits 0 on any partial success, non-zero only if the whole run
 * throws — so a single user failure doesn't red-flag the schedule.
 */
import { sendCheckinsToLinkedUsers } from "../src/lib/checkin";

async function main() {
  const { sent, total, results } = await sendCheckinsToLinkedUsers();
  console.log(`[checkin] Sent ${sent}/${total} check-ins`);
  for (const r of results) {
    if (!r.success) console.warn(`[checkin] ${r.name} failed: ${r.error}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[checkin] Fatal error:", err);
  process.exit(1);
});
