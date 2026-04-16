// Backfill `tags` JSON column on existing RetroItem rows using the same
// keyword heuristics as src/lib/tag-classifier.ts. Safe to re-run.
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "dev.db");
const db = new Database(dbPath);

const TAG_KEYWORDS = {
  QA: [
    /\bQA\b/i, /\btest(s|ing|ed|case|suite)?\b/i, /\bbug(s|gy)?\b/i,
    /\bregression/i, /\bquality\b/i, /\bcoverage\b/i, /\btriage\b/i,
    /\bdefect/i, /\bflaky\b/i, /\brollback/i,
  ],
  "Design Solution": [
    /\bdesign(s|er|ed|ing)?\b/i, /\bmockup/i, /\bwireframe/i, /\bprototype/i,
    /\bUX\b/i, /\bUI\b/i, /\bfigma\b/i, /\bonboarding flow/i,
    /\buser flow/i, /\bvisual\b/i, /\blayout\b/i,
  ],
  Spec: [
    /\bspec(s|ification)?\b/i, /\brequirement/i, /\bdocs?\b/i,
    /\bdocumentation\b/i, /\bPRD\b/i, /\bRFC\b/i, /\bAPI contract/i,
    /\bscope\b/i, /\bunclear\b/i, /\bfuzzy\b/i,
  ],
  Development: [
    /\bdeploy(s|ed|ment|ing)?\b/i, /\brefactor/i, /\bCI\b/i, /\bpipeline/i,
    /\bfeature flag/i, /\bAPI\b/i, /\brollout/i, /\bmonitor(ing)?\b/i,
    /\bauth\b/i, /\bmigration\b/i, /\bcode review/i, /\bpair programming/i,
    /\btech debt/i, /\bship(ped|ping)?\b/i, /\bbackend\b/i, /\bfrontend\b/i,
    /\bendpoint/i, /\bdatabase\b/i, /\binfrastructure\b/i, /\bperformance\b/i,
  ],
};

function autoTag(text) {
  if (!text || !text.trim()) return ["Other"];
  const matched = [];
  for (const tag of Object.keys(TAG_KEYWORDS)) {
    if (TAG_KEYWORDS[tag].some((re) => re.test(text))) matched.push(tag);
  }
  return matched.length > 0 ? matched : ["Other"];
}

const rows = db.prepare("SELECT id, wentWell, couldImprove, category FROM RetroItem").all();
const update = db.prepare("UPDATE RetroItem SET tags = ? WHERE id = ?");

let updated = 0;
for (const row of rows) {
  const text = row.category === "went_well" ? row.wentWell : row.couldImprove;
  const tags = autoTag(text || "");
  update.run(JSON.stringify(tags), row.id);
  updated += 1;
}

console.log(`[backfill-tags] Updated ${updated} retro items.`);
db.close();
