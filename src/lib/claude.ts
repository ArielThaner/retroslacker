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
    label: string;
    rationale: string;
  };
  synopsis: string;
  patterns: { title: string; mentions: number }[];
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
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze these retrospective items from a software team and generate:

1. "sentiment": an object with "label" (one of: "Positive", "Mixed", "Needs Attention") and "rationale" (1 sentence explaining why)
2. "synopsis": a 2-3 sentence summary of the sprint
3. "patterns": an array of objects with "title" (concise theme label, 2-5 words, e.g. "Standups too long", "Tech debt accumulating", "Deployment improvements") and "mentions" (integer count of how many people mentioned it). Sort by mentions descending (most mentioned first).

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
