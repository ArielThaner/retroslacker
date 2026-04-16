// One-off backfill: randomize every existing RetroItem's `week` to 1–3.
// Use this when upgrading an older DB whose items predate the "new items
// always land in week 4, historical items scatter across weeks 1–3" rule.
// Safe to run multiple times (idempotent only in distribution, not exact
// values — each run re-randomizes). Do NOT wire this into any auto-deploy
// step; it would clobber legitimately-week-4 items.
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db");
console.log("[randomize-weeks] Database path:", dbPath);
const db = new Database(dbPath);

const before = db.prepare(`SELECT week, COUNT(*) AS n FROM RetroItem GROUP BY week ORDER BY week`).all();
console.log("[randomize-weeks] Before:", before);

// SQLite RANDOM() returns a signed 64-bit int; ABS() then % 3 yields 0–2,
// + 1 shifts to 1–3.
const result = db.prepare(`UPDATE RetroItem SET week = (ABS(RANDOM()) % 3) + 1`).run();
console.log(`[randomize-weeks] Updated ${result.changes} rows.`);

const after = db.prepare(`SELECT week, COUNT(*) AS n FROM RetroItem GROUP BY week ORDER BY week`).all();
console.log("[randomize-weeks] After:", after);
db.close();
