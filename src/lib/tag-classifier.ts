import { RETRO_TAGS, type RetroTag } from "./tags";

// Keyword heuristics for auto-tagging retro items. Deterministic and free — no LLM call.
// Ordered from most-specific to least-specific; an item can match multiple tags.
const TAG_KEYWORDS: Record<Exclude<RetroTag, "Other">, RegExp[]> = {
  QA: [
    /\bQA\b/i,
    /\btest(s|ing|ed|case|suite)?\b/i,
    /\bbug(s|gy)?\b/i,
    /\bregression/i,
    /\bquality\b/i,
    /\bcoverage\b/i,
    /\btriage\b/i,
    /\bdefect/i,
    /\bflaky\b/i,
    /\brollback/i,
  ],
  "Design Solution": [
    /\bdesign(s|er|ed|ing)?\b/i,
    /\bmockup/i,
    /\bwireframe/i,
    /\bprototype/i,
    /\bUX\b/i,
    /\bUI\b/i,
    /\bfigma\b/i,
    /\bonboarding flow/i,
    /\buser flow/i,
    /\bvisual\b/i,
    /\blayout\b/i,
  ],
  Spec: [
    /\bspec(s|ification)?\b/i,
    /\brequirement/i,
    /\bdocs?\b/i,
    /\bdocumentation\b/i,
    /\bPRD\b/i,
    /\bRFC\b/i,
    /\bAPI contract/i,
    /\bscope\b/i,
    /\bunclear\b/i,
    /\bfuzzy\b/i,
  ],
  Development: [
    /\bdeploy(s|ed|ment|ing)?\b/i,
    /\brefactor/i,
    /\bCI\b/i,
    /\bpipeline/i,
    /\bfeature flag/i,
    /\bAPI\b/i,
    /\brollout/i,
    /\bmonitor(ing)?\b/i,
    /\bauth\b/i,
    /\bmigration\b/i,
    /\bcode review/i,
    /\bpair programming/i,
    /\btech debt/i,
    /\bship(ped|ping)?\b/i,
    /\bbackend\b/i,
    /\bfrontend\b/i,
    /\bendpoint/i,
    /\bdatabase\b/i,
    /\binfrastructure\b/i,
    /\bperformance\b/i,
  ],
};

/**
 * Classify a retro item's text into one or more tags from our taxonomy.
 * Returns at least one tag — falls back to ["Other"] if no keywords match.
 */
export function autoTagRetroItem(text: string): RetroTag[] {
  if (!text?.trim()) return ["Other"];

  const matched: RetroTag[] = [];
  for (const tag of Object.keys(TAG_KEYWORDS) as Exclude<RetroTag, "Other">[]) {
    const patterns = TAG_KEYWORDS[tag];
    if (patterns.some((re) => re.test(text))) {
      matched.push(tag);
    }
  }

  if (matched.length === 0) return ["Other"];
  return matched;
}

// Serialize/parse helpers for the JSON-string `tags` column.
export function serializeTags(tags: RetroTag[]): string {
  const valid = tags.filter((t) => (RETRO_TAGS as readonly string[]).includes(t));
  const unique = Array.from(new Set(valid));
  return JSON.stringify(unique.length > 0 ? unique : ["Other"]);
}

export function parseTags(raw: string | null | undefined): RetroTag[] {
  if (!raw) return ["Other"];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ["Other"];
    const valid = parsed.filter(
      (t): t is RetroTag => typeof t === "string" && (RETRO_TAGS as readonly string[]).includes(t)
    );
    return valid.length > 0 ? valid : ["Other"];
  } catch {
    return ["Other"];
  }
}
