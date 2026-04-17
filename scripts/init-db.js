const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db");
console.log("[init-db] Database path:", dbPath);

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// Check if User table exists
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'").get();

// Idempotent ALTER TABLE for columns added after the initial deploy. We can't
// rely on Prisma migrate here because the production DB was bootstrapped by
// this same init script (not via `prisma migrate`), so there's no
// _prisma_migrations history table and `migrate deploy` would refuse to run.
// Instead we introspect PRAGMA table_info and ADD COLUMN only what's missing.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info("${table}")`).all();
  if (!cols.some((c) => c.name === column)) {
    console.log(`[init-db] Adding missing column ${table}.${column}`);
    db.exec(`ALTER TABLE "${table}" ADD COLUMN ${ddl};`);
  }
}

if (tableExists) {
  // Bring older production schemas in line with the current model. These
  // correspond to Prisma migrations 20260416000000_add_retro_item_tag,
  // 20260416000100_add_retro_item_week, and 20260416000200_add_retro_item_tags_array,
  // plus the earlier discussed/addedAsAction additions on RetroItem and
  // status on ActionItem.
  ensureColumn("RetroItem", "discussed", `"discussed" BOOLEAN NOT NULL DEFAULT 0`);
  ensureColumn("RetroItem", "addedAsAction", `"addedAsAction" BOOLEAN NOT NULL DEFAULT 0`);
  ensureColumn("RetroItem", "tag", `"tag" TEXT NOT NULL DEFAULT 'Other'`);
  ensureColumn("RetroItem", "tags", `"tags" TEXT NOT NULL DEFAULT '["Other"]'`);
  ensureColumn("RetroItem", "week", `"week" INTEGER NOT NULL DEFAULT 4`);
  ensureColumn("ActionItem", "status", `"status" TEXT NOT NULL DEFAULT 'active'`);
  ensureColumn("ActionItem", "note", `"note" TEXT`);
  ensureColumn("ActionItem", "relatedRetroItemIds", `"relatedRetroItemIds" TEXT`);
  console.log("[init-db] Schema check complete — tables already seeded, skipping seed");
  db.close();
  process.exit(0);
}

console.log("[init-db] Creating tables...");

db.exec(`
  CREATE TABLE IF NOT EXISTS "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "avatarUrl" TEXT,
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "slackUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
  CREATE UNIQUE INDEX IF NOT EXISTS "User_slackUserId_key" ON "User"("slackUserId");

  CREATE TABLE IF NOT EXISTS "RetroItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "sprintId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wentWell" TEXT NOT NULL DEFAULT '',
    "couldImprove" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'went_well',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "discussed" BOOLEAN NOT NULL DEFAULT false,
    "addedAsAction" BOOLEAN NOT NULL DEFAULT false,
    "tag" TEXT NOT NULL DEFAULT 'Other',
    "tags" TEXT NOT NULL DEFAULT '["Other"]',
    "week" INTEGER NOT NULL DEFAULT 4,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetroItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "RetroSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sprintId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentiment" TEXT,
    "synopsis" TEXT,
    "patterns" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "RetroSession_sprintId_key" ON "RetroSession"("sprintId");

  CREATE TABLE IF NOT EXISTS "ActionItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "assignedUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "relatedRetroItemIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RetroSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActionItem_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );
`);

console.log("[init-db] Tables created. Seeding users...");

const now = new Date().toISOString();

const users = [
  { name: "Amy Ng", username: "amy", password: "123", avatarColor: "#3B82F6", avatarUrl: "/avatars/amy.png", jobTitle: "Engineering Manager" },
  { name: "Emily Hu", username: "emily", password: "123", avatarColor: "#8B5CF6", avatarUrl: "/avatars/emily.png", jobTitle: "Product Designer" },
  { name: "Sam Patel", username: "sam", password: "password", avatarColor: "#10B981", avatarUrl: null, jobTitle: "Backend Engineer" },
  { name: "Morgan Lee", username: "morgan", password: "password", avatarColor: "#F59E0B", avatarUrl: null, jobTitle: "QA Engineer" },
  { name: "Ariel Nichols", username: "ariel", password: "123", avatarColor: "#EF4444", avatarUrl: "/avatars/ariel.png", jobTitle: "Software Engineer" },
];

const insertUser = db.prepare("INSERT OR IGNORE INTO User (name, username, password, avatarColor, avatarUrl, jobTitle, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");

for (const u of users) {
  insertUser.run(u.name, u.username, u.password, u.avatarColor, u.avatarUrl, u.jobTitle, now);
}

// Seed retro items
const insertItem = db.prepare("INSERT INTO RetroItem (userId, sprintId, content, wentWell, couldImprove, category, source, tag, tags, week, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

// Deterministic keyword-based auto-tagger — kept in sync with src/lib/tag-classifier.ts.
const AUTO_TAG_RULES = {
  QA: [/\bQA\b/i, /\btest(s|ing|ed|case|suite)?\b/i, /\bbug(s|gy)?\b/i, /\bregression/i, /\bquality\b/i, /\bcoverage\b/i, /\btriage\b/i, /\bdefect/i, /\bflaky\b/i, /\brollback/i],
  "Design Solution": [/\bdesign(s|er|ed|ing)?\b/i, /\bmockup/i, /\bwireframe/i, /\bprototype/i, /\bUX\b/i, /\bUI\b/i, /\bfigma\b/i, /\bonboarding flow/i, /\buser flow/i, /\bvisual\b/i, /\blayout\b/i],
  Spec: [/\bspec(s|ification)?\b/i, /\brequirement/i, /\bdocs?\b/i, /\bdocumentation\b/i, /\bPRD\b/i, /\bRFC\b/i, /\bAPI contract/i, /\bscope\b/i, /\bunclear\b/i, /\bfuzzy\b/i],
  Development: [/\bdeploy(s|ed|ment|ing)?\b/i, /\brefactor/i, /\bCI\b/i, /\bpipeline/i, /\bfeature flag/i, /\bAPI\b/i, /\brollout/i, /\bmonitor(ing)?\b/i, /\bauth\b/i, /\bmigration\b/i, /\bcode review/i, /\bpair programming/i, /\btech debt/i, /\bship(ped|ping)?\b/i, /\bbackend\b/i, /\bfrontend\b/i, /\bendpoint/i, /\bdatabase\b/i, /\binfrastructure\b/i, /\bperformance\b/i],
};

function autoTag(text) {
  if (!text || !text.trim()) return ["Other"];
  const matched = [];
  for (const tag of Object.keys(AUTO_TAG_RULES)) {
    if (AUTO_TAG_RULES[tag].some((re) => re.test(text))) matched.push(tag);
  }
  return matched.length > 0 ? matched : ["Other"];
}
const sprintId = "sprint-24";

const userRows = db.prepare("SELECT id, username FROM User").all();
const userMap = {};
for (const row of userRows) userMap[row.username] = row.id;

// Sprint starts April 7, 2026 (Tuesday). Week 1 = Apr 7, Week 2 = Apr 14, Week 3 = Apr 21, Week 4 = Apr 28.
const weekStartISO = {
  1: "2026-04-07T15:00:00.000Z",
  2: "2026-04-14T15:00:00.000Z",
  3: "2026-04-21T15:00:00.000Z",
  4: "2026-04-28T15:00:00.000Z",
};

// Keep in sync with src/lib/seed-data.ts — the Settings → "Reset
// experience" button replays that TS module via Prisma, and this script
// is the fresh-DB bootstrap equivalent. Editorial rule:
//   - Amy → all went_well (she's the consistently-positive voice)
//   - Morgan → all could_improve (she's the consistently-critical voice)
const items = [
  // Amy — all positive
  { user: "amy", week: 1, msg: "Deployment went smoothly this week and the new monitoring dashboard caught an issue before users noticed. Team energy feels high.", items: [
    { wentWell: "Deployment went smoothly this week", category: "went_well", tag: "Development" },
    { wentWell: "New monitoring dashboard caught an issue before users noticed", category: "went_well", tag: "Development" },
    { wentWell: "Team energy feels high heading into the back half of the sprint", category: "went_well", tag: "Other" },
  ]},
  { user: "amy", week: 2, msg: "Really happy with how the team handled the auth migration. 1:1s this cycle have felt focused and useful.", items: [
    { wentWell: "Team handled the auth migration really well", category: "went_well", tag: "Development" },
    { wentWell: "1:1s this sprint felt focused and productive", category: "went_well", tag: "Other" },
  ]},
  { user: "amy", week: 3, msg: "Demo day landed — stakeholders were genuinely engaged.", items: [
    { wentWell: "Demo day energy was high and stakeholders were engaged", category: "went_well", tag: "Other" },
  ]},

  // Emily — mixed
  { user: "emily", week: 1, msg: "Code reviews were thorough and pair programming helped. But context switches and outdated docs were painful.", items: [
    { wentWell: "Code reviews were thorough this sprint", category: "went_well", tag: "Development" },
    { wentWell: "Pair programming sessions were really productive", category: "went_well", tag: "Development" },
    { couldImprove: "Too many context switches between tasks", category: "could_improve", tag: "Other" },
    { couldImprove: "Documentation was outdated for the API changes", category: "could_improve", tag: "Spec" },
  ]},
  { user: "emily", week: 2, msg: "The new onboarding flow mockups got great reception from stakeholders.", items: [
    { wentWell: "Onboarding flow mockups landed well with stakeholders", category: "went_well", tag: "Design Solution" },
  ]},

  // Sam — mixed
  { user: "sam", week: 2, msg: "New CI pipeline is great and bug triage is working. Requirements were fuzzy and too many Monday meetings.", items: [
    { wentWell: "New CI pipeline saved us a lot of time", category: "went_well", tag: "Development" },
    { wentWell: "Bug triage process is working well", category: "went_well", tag: "QA" },
    { couldImprove: "Requirements were unclear at sprint start", category: "could_improve", tag: "Spec" },
    { couldImprove: "Too many meetings on Monday mornings", category: "could_improve", tag: "Other" },
  ]},

  // Morgan — all negative
  { user: "morgan", week: 1, msg: "Standups are dragging on and the rollback story still scares me. QA keeps getting squeezed at the end of the sprint.", items: [
    { couldImprove: "Standups are too long and unfocused", category: "could_improve", tag: "Other" },
    { couldImprove: "Deployment process needs better rollback procedures", category: "could_improve", tag: "QA" },
    { couldImprove: "QA time keeps getting squeezed at the end of the sprint", category: "could_improve", tag: "QA" },
  ]},
  { user: "morgan", week: 2, msg: "Regression coverage is still thin — flaky tests mask real failures.", items: [
    { couldImprove: "Regression suite still misses flaky-test categories", category: "could_improve", tag: "QA" },
    { couldImprove: "QA handoff from dev is inconsistent sprint-to-sprint", category: "could_improve", tag: "QA" },
  ]},
  { user: "morgan", week: 3, msg: "Monday bug triage is stealing hours I need for exploratory testing.", items: [
    { couldImprove: "Bug triage Mondays run late and steal from testing time", category: "could_improve", tag: "Other" },
  ]},

  // Ariel — mixed
  { user: "ariel", week: 1, msg: "Shipped API refactor ahead of schedule and code review loop was tight. Tech debt and test coverage are concerns.", items: [
    { wentWell: "Shipped the new API refactor ahead of schedule", category: "went_well", tag: "Development" },
    { wentWell: "Code review feedback loop was tight", category: "went_well", tag: "Development" },
    { couldImprove: "Tech debt is piling up and slowing us down", category: "could_improve", tag: "Development" },
    { couldImprove: "Need better test coverage for critical paths", category: "could_improve", tag: "QA" },
  ]},
];

for (const group of items) {
  const userId = userMap[group.user];
  if (!userId) continue;
  // Existing / seeded retro items get a random week from 1–3. Week 4 is
  // reserved for items added live (manual input or real-time Slack) so the
  // seed data always looks like it came in over the first three weeks of
  // the sprint. See also scripts/randomize-weeks.js for backfilling older DBs.
  const randomWeek = 1 + Math.floor(Math.random() * 3);
  const createdAt = weekStartISO[randomWeek];
  for (const item of group.items) {
    const text = item.wentWell || item.couldImprove || "";
    const autoTags = autoTag(text);
    // Merge the hand-authored tag with auto-detected tags.
    const merged = Array.from(new Set([item.tag || "Other", ...autoTags]));
    insertItem.run(
      userId, sprintId, group.msg,
      item.wentWell || "", item.couldImprove || "",
      item.category,
      group.user === "amy" && group.msg.includes("feature flags") ? "manual" : "slack",
      item.tag || "Other",
      JSON.stringify(merged),
      randomWeek,
      createdAt, createdAt
    );
  }
}

// Create pending session for current sprint
db.prepare("INSERT OR IGNORE INTO RetroSession (sprintId, status, createdAt) VALUES (?, 'pending', ?)").run(sprintId, now);

// Seed historical retro sessions for analytics
const historicalSprints = [
  { sprintId: "sprint-20", sentiment: "5", synopsis: "Solid sprint with some communication gaps.", weeks: [4, 5, 5, 5], createdAt: "2026-01-12T00:00:00.000Z" },
  { sprintId: "sprint-21", sentiment: "6", synopsis: "Improved processes led to better delivery.", weeks: [5, 6, 6, 6], createdAt: "2026-02-09T00:00:00.000Z" },
  { sprintId: "sprint-22", sentiment: "7", synopsis: "Strong execution with great team collaboration.", weeks: [6, 7, 7, 8], createdAt: "2026-03-09T00:00:00.000Z" },
  { sprintId: "sprint-23", sentiment: "5", synopsis: "Challenging sprint with scope creep and unclear requirements.", weeks: [7, 6, 5, 4], createdAt: "2026-03-30T00:00:00.000Z" },
];

const insertSession = db.prepare("INSERT OR IGNORE INTO RetroSession (sprintId, status, sentiment, synopsis, createdAt) VALUES (?, 'completed', ?, ?, ?)");
for (const s of historicalSprints) {
  insertSession.run(s.sprintId, s.sentiment, s.synopsis, s.createdAt);
}

// Seed action items for the most-recent previous retro (sprint-23),
// assigned to the signed-in test user (ariel). These populate the
// "My Actions" section on the Home dashboard so the new vertical
// action cards have something to render out of the box.
const prevSession = db.prepare("SELECT id FROM RetroSession WHERE sprintId = ?").get("sprint-23");
if (prevSession) {
  const insertAction = db.prepare(
    "INSERT INTO ActionItem (sessionId, description, assignedUserId, status, relatedRetroItemIds, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  );

  // Per-user seeded action items. Each user gets 5 entries (4 active,
  // 1 completed) so the Home dashboard's deterministic picker — which
  // trims to 3–4 active + 0–1 completed — always has enough to choose
  // from regardless of which user signs in.
  const perUserSeeds = {
    ariel: [
      { d: "Draft an API versioning RFC covering URL path, header, and deprecation policy. Share with the backend guild for review before next sprint planning.", s: "active" },
      { d: "Set up a feature-flag rollout plan for the new onboarding flow — 10% internal, 25% beta cohort, then full production once error rate stays flat for 48h.", s: "active" },
      { d: "Add regression tests covering the billing webhook edge cases we missed last month: retries, out-of-order events, and duplicate idempotency keys.", s: "active" },
      { d: "Schedule a cross-team sync with Platform to align on the new auth migration timeline and unblock the mobile rollout.", s: "active" },
      { d: "Audit the open tech-debt tickets in Linear and propose the top 3 candidates to tackle next sprint, with rough effort estimates.", s: "completed" },
    ],
    amy: [
      { d: "Put a time-boxed standup format in place — 10 minutes max, defer deep dives to follow-up threads.", s: "active" },
      { d: "Review the on-call rotation pages from last month, categorize by severity, and propose alert thresholds that reduce noise without missing real incidents.", s: "active" },
      { d: "Pilot feature flags with the next two medium-risk rollouts; document learnings for the rest of the org.", s: "active" },
      { d: "Book 1:1s with the two new hires to check in on ramp-up and collect onboarding friction points.", s: "active" },
      { d: "Write a short retro on the auth migration and share with engineering leadership.", s: "completed" },
    ],
    emily: [
      { d: "Refresh the onboarding flow mockups with the stakeholder feedback and hand off a clickable prototype for user testing.", s: "active" },
      { d: "Document the design review cadence and publish it to the team wiki so async reviewers know what's expected.", s: "active" },
      { d: "Kick off a UX audit of the dashboard — prioritize three friction points to address before the next release.", s: "active" },
      { d: "Pair with a frontend engineer to spec out the new empty-state illustrations and finalize the asset checklist.", s: "active" },
      { d: "Archive the deprecated Figma components and update the design system README.", s: "completed" },
    ],
    sam: [
      { d: "Stand up a staging environment that mirrors production data so the new CI pipeline can run full integration tests before merge.", s: "active" },
      { d: "Profile the slow endpoints flagged during the bug triage and propose a caching layer or query rewrite per hotspot.", s: "active" },
      { d: "Write clear acceptance criteria for the next three sprint stories so we don't enter sprint with fuzzy requirements again.", s: "active" },
      { d: "Reduce Monday meeting load: consolidate the three recurring status meetings into one 25-minute block.", s: "active" },
      { d: "Upgrade the Node runtime on the worker service and verify memory usage under load.", s: "completed" },
    ],
    morgan: [
      { d: "Document the rollback procedure for every service we own, including commands, contacts, and expected downtime.", s: "active" },
      { d: "Expand the regression suite with the three scenarios that bit us last release — including at least one chaos-style test.", s: "active" },
      { d: "Propose a standup format tweak to the EM: async updates Mon/Wed/Fri, live sync Tue/Thu only.", s: "active" },
      { d: "Run a brown-bag on knowledge-sharing tools the team adopted this sprint and capture the top 3 tips in the wiki.", s: "active" },
      { d: "Triaged and closed the stale QA bugs older than 90 days.", s: "completed" },
    ],
  };

  for (const [username, seeds] of Object.entries(perUserSeeds)) {
    const uid = userMap[username];
    if (!uid) continue;
    const existing = db.prepare("SELECT COUNT(*) as n FROM ActionItem WHERE sessionId = ? AND assignedUserId = ?").get(prevSession.id, uid);
    if (existing.n > 0) continue;

    // Prefer retro items the user themselves wrote so the "Associated
    // retro items" count points at rows the user will recognize. Fall
    // back to any items in the sprint if they didn't submit any.
    let userItems = db.prepare("SELECT id FROM RetroItem WHERE userId = ? LIMIT 10").all(uid).map((r) => r.id);
    if (userItems.length === 0) {
      userItems = db.prepare("SELECT id FROM RetroItem LIMIT 10").all().map((r) => r.id);
    }
    const pick = (n) => JSON.stringify(userItems.slice(0, Math.min(n, userItems.length)));

    // Deterministic-ish per-action related count: cycle 2→3→4→2→1 so
    // cards display varied counts without being random across reloads.
    const counts = [3, 2, 4, 2, 1];
    seeds.forEach((a, i) => {
      insertAction.run(prevSession.id, a.d, uid, a.s, pick(counts[i] ?? 2), now);
    });
  }
}

console.log("[init-db] Seed complete!");
db.close();
