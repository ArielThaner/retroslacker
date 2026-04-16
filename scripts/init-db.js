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

if (tableExists) {
  console.log("[init-db] Tables already exist, skipping init");
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
const insertItem = db.prepare("INSERT INTO RetroItem (userId, sprintId, content, wentWell, couldImprove, category, source, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
const sprintId = "sprint-24";

const userRows = db.prepare("SELECT id, username FROM User").all();
const userMap = {};
for (const row of userRows) userMap[row.username] = row.id;

const items = [
  { user: "amy", msg: "Deployment went smoothly this week and the new monitoring dashboard caught an issue before users noticed. But standups are dragging on too long.", items: [
    { wentWell: "Deployment went smoothly this week", category: "went_well" },
    { wentWell: "New monitoring dashboard caught an issue before users noticed", category: "went_well" },
    { couldImprove: "Standups are dragging on too long", category: "could_improve" },
  ]},
  { user: "amy", msg: "Really happy with how the team handled the auth migration. The on-call rotation needs some work though.", items: [
    { wentWell: "Team handled the auth migration really well", category: "went_well" },
    { couldImprove: "On-call rotation needs work — too many non-critical pages", category: "could_improve" },
  ]},
  { user: "amy", msg: "We should adopt feature flags for safer rollouts", items: [
    { couldImprove: "We should adopt feature flags for safer rollouts", category: "could_improve" },
  ]},
  { user: "emily", msg: "Code reviews were thorough and pair programming helped. But context switches and outdated docs were painful.", items: [
    { wentWell: "Code reviews were thorough this sprint", category: "went_well" },
    { wentWell: "Pair programming sessions were really productive", category: "went_well" },
    { couldImprove: "Too many context switches between tasks", category: "could_improve" },
    { couldImprove: "Documentation was outdated for the API changes", category: "could_improve" },
  ]},
  { user: "sam", msg: "New CI pipeline is great and bug triage is working. Requirements were fuzzy and too many Monday meetings.", items: [
    { wentWell: "New CI pipeline saved us a lot of time", category: "went_well" },
    { wentWell: "Bug triage process is working well", category: "went_well" },
    { couldImprove: "Requirements were unclear at sprint start", category: "could_improve" },
    { couldImprove: "Too many meetings on Monday mornings", category: "could_improve" },
  ]},
  { user: "morgan", msg: "Great collaboration on auth feature and knowledge sharing. Standups need to be shorter and rollback procedures need work.", items: [
    { wentWell: "Team collaboration was great on the auth feature", category: "went_well" },
    { wentWell: "Knowledge sharing sessions helped onboard new tools", category: "went_well" },
    { couldImprove: "Standups are too long and unfocused", category: "could_improve" },
    { couldImprove: "Deployment process needs better rollback procedures", category: "could_improve" },
  ]},
  { user: "ariel", msg: "Shipped API refactor ahead of schedule and code review loop was tight. Tech debt and test coverage are concerns.", items: [
    { wentWell: "Shipped the new API refactor ahead of schedule", category: "went_well" },
    { wentWell: "Code review feedback loop was tight", category: "went_well" },
    { couldImprove: "Tech debt is piling up and slowing us down", category: "could_improve" },
    { couldImprove: "Need better test coverage for critical paths", category: "could_improve" },
  ]},
];

for (const group of items) {
  const userId = userMap[group.user];
  if (!userId) continue;
  for (const item of group.items) {
    insertItem.run(
      userId, sprintId, group.msg,
      item.wentWell || "", item.couldImprove || "",
      item.category, group.user === "amy" && group.msg.includes("feature flags") ? "manual" : "slack",
      now, now
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
