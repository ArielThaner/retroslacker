import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function parseReflection(text: string): Promise<{
  went_well: string[];
  could_improve: string[];
}> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Parse this team member's weekly reflection and extract:
1. "went_well": things that went well (array of strings)
2. "could_improve": things that could be better (array of strings)

Reflection: "${text}"

Return JSON only, no markdown formatting.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return JSON.parse(content.text);
}

export interface RetroInsights {
  sentiment: {
    score: number;
    summary: string;
  };
  synopsis: string;
  patterns: { title: string; mentions: number; participants: number; sentiment: "positive" | "negative"; relatedUsers: string[]; relatedItems: string[] }[];
}

export async function generateInsights(
  items: { userName: string; category: string; wentWell: string; couldImprove: string }[]
): Promise<RetroInsights> {
  const itemsSummary = items
    .map(
      (item) =>
        `${item.userName} - ${item.category === "went_well" ? "Went Well" : "Could Improve"}: ${item.category === "went_well" ? item.wentWell : item.couldImprove}`
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: `Analyze these retrospective items from a software team and generate:

1. "sentiment": an object with "score" (integer 1-10, where 1=terrible, 5=mixed, 10=excellent) and "summary" (1 concise sentence, max 15 words)
2. "synopsis": 1-2 concise sentences describing what the team accomplished and what challenges they faced this sprint (max 40 words, focus on concrete outcomes)
3. "patterns": an array of objects with "title" (descriptive 3-6 word label with an adjective that conveys the nature, e.g. "Lengthy unfocused standups", "Smooth deployment process", "Unclear sprint requirements"), "mentions" (total number of retro items about this theme), "participants" (number of distinct people who mentioned it), "sentiment" ("positive" or "negative"), "relatedUsers" (array of names of people who mentioned this pattern), and "relatedItems" (array of the exact retro item texts that relate to this pattern — copy them verbatim from the items list). Only include patterns with 2+ mentions. Sort by mentions descending.

Items:
${itemsSummary}

Return JSON only, no markdown formatting.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return JSON.parse(content.text);
}

export async function generateActionItems(
  items: { userName: string; category: string; wentWell: string; couldImprove: string }[],
  patterns: string[]
): Promise<{ description: string }[]> {
  const itemsSummary = items
    .map(
      (item) =>
        `${item.userName} - ${item.category === "went_well" ? "Went Well" : "Could Improve"}: ${item.category === "went_well" ? item.wentWell : item.couldImprove}`
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Based on these retrospective items from a software team, generate 3-5 concrete, actionable improvements for the next sprint. Be specific. Return as JSON array of {description: string} objects. Prioritize the most impactful changes.

Items:
${itemsSummary}

Patterns detected:
${patterns.join("\n")}

Return JSON only, no markdown formatting.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return JSON.parse(content.text);
}
