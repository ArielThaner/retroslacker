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

const items = [
  { user: "amy", week: 1, msg: "Deployment went smoothly this week and the new monitoring dashboard caught an issue before users noticed. But standups are dragging on too long.", items: [
    { wentWell: "Deployment went smoothly this week", category: "went_well", tag: "Development" },
    { wentWell: "New monitoring dashboard caught an issue before users noticed", category: "went_well", tag: "Development" },
    { couldImprove: "Standups are dragging on too long", category: "could_improve", tag: "Other" },
  ]},
  { user: "amy", week: 2, msg: "Really happy with how the team handled the auth migration. The on-call rotation needs some work though.", items: [
    { wentWell: "Team handled the auth migration really well", category: "went_well", tag: "Development" },
    { couldImprove: "On-call rotation needs work — too many non-critical pages", category: "could_improve", tag: "Other" },
  ]},
  { user: "amy", week: 3, msg: "We should adopt feature flags for safer rollouts", items: [
    { couldImprove: "We should adopt feature flags for safer rollouts", category: "could_improve", tag: "Development" },
  ]},
  { user: "emily", week: 1, msg: "Code reviews were thorough and pair programming helped. But context switches and outdated docs were painful.", items: [
    { wentWell: "Code reviews were thorough this sprint", category: "went_well", tag: "Development" },
    { wentWell: "Pair programming sessions were really productive", category: "went_well", tag: "Development" },
    { couldImprove: "Too many context switches between tasks", category: "could_improve", tag: "Other" },
    { couldImprove: "Documentation was outdated for the API changes", category: "could_improve", tag: "Spec" },
  ]},
  { user: "sam", week: 2, msg: "New CI pipeline is great and bug triage is working. Requirements were fuzzy and too many Monday meetings.", items: [
    { wentWell: "New CI pipeline saved us a lot of time", category: "went_well", tag: "Development" },
    { wentWell: "Bug triage process is working well", category: "went_well", tag: "QA" },
    { couldImprove: "Requirements were unclear at sprint start", category: "could_improve", tag: "Spec" },
    { couldImprove: "Too many meetings on Monday mornings", category: "could_improve", tag: "Other" },
  ]},
  { user: "morgan", week: 3, msg: "Great collaboration on auth feature and knowledge sharing. Standups need to be shorter and rollback procedures need work.", items: [
    { wentWell: "Team collaboration was great on the auth feature", category: "went_well", tag: "Development" },
    { wentWell: "Knowledge sharing sessions helped onboard new tools", category: "went_well", tag: "Other" },
    { couldImprove: "Standups are too long and unfocused", category: "could_improve", tag: "Other" },
    { couldImprove: "Deployment process needs better rollback procedures", category: "could_improve", tag: "QA" },
  ]},
  { user: "ariel", week: 1, msg: "Shipped API refactor ahead of schedule and code review loop was tight. Tech debt and test coverage are concerns.", items: [
    { wentWell: "Shipped the new API refactor ahead of schedule", category: "went_well", tag: "Development" },
    { wentWell: "Code review feedback loop was tight", category: "went_well", tag: "Development" },
    { couldImprove: "Tech debt is piling up and slowing us down", category: "could_improve", tag: "Development" },
    { couldImprove: "Need better test coverage for critical paths", category: "could_improve", tag: "QA" },
  ]},
  { user: "emily", week: 2, msg: "The new onboarding flow mockups got great reception from stakeholders.", items: [
    { wentWell: "Onboarding flow mockups landed well with stakeholders", category: "went_well", tag: "Design Solution" },
  ]},
  { user: "morgan", week: 3, msg: "Regression pass caught two critical bugs before release", items: [
    { wentWell: "Regression pass caught two critical bugs before release", category: "went_well", tag: "QA" },
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

console.log("[init-db] Seed complete!");
db.close();
