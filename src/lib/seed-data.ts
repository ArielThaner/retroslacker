/**
 * Single source of truth for all mock / demo data in RetroSlacker.
 *
 * This file is consumed by:
 *   - `scripts/init-db.js`            — first-time DB bootstrap (keep in sync,
 *                                       that script reads a mirrored JS copy).
 *   - `resetExperience` server action — the "Reset experience" button in the
 *                                       user-menu Settings modal wipes the
 *                                       demo-data tables and replays these
 *                                       records.
 *   - `src/app/analytics/page.tsx`    — the "historical" charts (sprints
 *                                       17–23) are pulled directly from the
 *                                       `HISTORICAL_*` exports below, so the
 *                                       whole experience stays consistent
 *                                       with one set of numbers.
 *
 * Editorial choices baked into the data:
 *   - **Amy Ng** is primarily positive — all of her retro items land in
 *     `went_well`. She still shows up on the board with plenty to celebrate.
 *   - **Morgan Lee** is all negative — every one of her items is a
 *     `could_improve`. She's the person who notices what's broken.
 *
 * Types are intentionally narrow so Prisma writes stay well-typed when the
 * server action consumes these records.
 */

import type { RetroTag } from "./tags";

/* ---------------------------------------------------------------- users */

export interface SeedUser {
  username: string;
  name: string;
  password: string;
  avatarColor: string;
  avatarUrl: string | null;
  jobTitle: string;
}

export const SEED_USERS: SeedUser[] = [
  {
    username: "amy",
    name: "Amy Ng",
    password: "amy123",
    avatarColor: "#3B82F6",
    avatarUrl: "/avatars/amy.png",
    jobTitle: "Engineering Manager",
  },
  {
    username: "emily",
    name: "Emily Hu",
    password: "emily123",
    avatarColor: "#8B5CF6",
    avatarUrl: "/avatars/emily.png",
    jobTitle: "Product Designer",
  },
  {
    username: "sam",
    name: "Sam Patel",
    password: "sam123",
    avatarColor: "#10B981",
    avatarUrl: null,
    jobTitle: "Backend Engineer",
  },
  {
    username: "morgan",
    name: "Morgan Lee",
    password: "morgan123",
    avatarColor: "#F59E0B",
    avatarUrl: null,
    jobTitle: "QA Engineer",
  },
  {
    username: "ariel",
    name: "Ariel Nichols",
    password: "ariel123",
    avatarColor: "#EF4444",
    avatarUrl: "/avatars/ariel.png",
    jobTitle: "Software Engineer",
  },
];

/* ------------------------------------------------------- current sprint */

/** ISO timestamp for each seedable week of the current sprint. */
export const SPRINT_WEEK_START_ISO: Record<1 | 2 | 3 | 4, string> = {
  1: "2026-04-07T15:00:00.000Z",
  2: "2026-04-14T15:00:00.000Z",
  3: "2026-04-21T15:00:00.000Z",
  4: "2026-04-28T15:00:00.000Z",
};

export interface SeedRetroItem {
  text: string;
  category: "went_well" | "could_improve";
  tag: RetroTag;
}

export interface SeedRetroGroup {
  username: string;
  week: 1 | 2 | 3;
  message: string;
  source: "slack" | "manual";
  items: SeedRetroItem[];
}

/**
 * Retro items seeded for the current sprint (`SPRINT_ID` in `lib/auth`).
 * Grouped by the Slack message that produced them so the Messages view on
 * Home stays coherent.
 *
 * - Amy's groups contain ONLY `went_well` items.
 * - Morgan's groups contain ONLY `could_improve` items.
 * - Emily / Sam / Ariel stay mixed.
 */
export const SEED_RETRO_GROUPS: SeedRetroGroup[] = [
  // Amy — all positive
  {
    username: "amy",
    week: 1,
    message:
      "Deployment went smoothly this week and the new monitoring dashboard caught an issue before users noticed. Team energy feels high.",
    source: "slack",
    items: [
      { text: "Deployment went smoothly this week", category: "went_well", tag: "Development" },
      { text: "New monitoring dashboard caught an issue before users noticed", category: "went_well", tag: "Development" },
      { text: "Team energy feels high heading into the back half of the sprint", category: "went_well", tag: "Other" },
    ],
  },
  {
    username: "amy",
    week: 2,
    message:
      "Really happy with how the team handled the auth migration. 1:1s this cycle have felt focused and useful.",
    source: "slack",
    items: [
      { text: "Team handled the auth migration really well", category: "went_well", tag: "Development" },
      { text: "1:1s this sprint felt focused and productive", category: "went_well", tag: "Other" },
    ],
  },
  {
    username: "amy",
    week: 3,
    message: "Demo day landed — stakeholders were genuinely engaged.",
    source: "manual",
    items: [
      { text: "Demo day energy was high and stakeholders were engaged", category: "went_well", tag: "Other" },
    ],
  },

  // Emily — mixed
  {
    username: "emily",
    week: 1,
    message:
      "Code reviews were thorough and pair programming helped. But context switches and outdated docs were painful.",
    source: "slack",
    items: [
      { text: "Code reviews were thorough this sprint", category: "went_well", tag: "Development" },
      { text: "Pair programming sessions were really productive", category: "went_well", tag: "Development" },
      { text: "Too many context switches between tasks", category: "could_improve", tag: "Other" },
      { text: "Documentation was outdated for the API changes", category: "could_improve", tag: "Spec" },
    ],
  },
  {
    username: "emily",
    week: 2,
    message: "The new onboarding flow mockups got great reception from stakeholders.",
    source: "slack",
    items: [
      { text: "Onboarding flow mockups landed well with stakeholders", category: "went_well", tag: "Design Solution" },
    ],
  },

  // Sam — mixed
  {
    username: "sam",
    week: 2,
    message:
      "New CI pipeline is great and bug triage is working. Requirements were fuzzy and too many Monday meetings.",
    source: "slack",
    items: [
      { text: "New CI pipeline saved us a lot of time", category: "went_well", tag: "Development" },
      { text: "Bug triage process is working well", category: "went_well", tag: "QA" },
      { text: "Requirements were unclear at sprint start", category: "could_improve", tag: "Spec" },
      { text: "Too many meetings on Monday mornings", category: "could_improve", tag: "Other" },
    ],
  },

  // Morgan — all negative
  {
    username: "morgan",
    week: 1,
    message:
      "Standups are dragging on and the rollback story still scares me. QA keeps getting squeezed at the end of the sprint.",
    source: "slack",
    items: [
      { text: "Standups are too long and unfocused", category: "could_improve", tag: "Other" },
      { text: "Deployment process needs better rollback procedures", category: "could_improve", tag: "QA" },
      { text: "QA time keeps getting squeezed at the end of the sprint", category: "could_improve", tag: "QA" },
    ],
  },
  {
    username: "morgan",
    week: 2,
    message: "Regression coverage is still thin — flaky tests mask real failures.",
    source: "slack",
    items: [
      { text: "Regression suite still misses flaky-test categories", category: "could_improve", tag: "QA" },
      { text: "QA handoff from dev is inconsistent sprint-to-sprint", category: "could_improve", tag: "QA" },
    ],
  },
  {
    username: "morgan",
    week: 3,
    message: "Monday bug triage is stealing hours I need for exploratory testing.",
    source: "manual",
    items: [
      { text: "Bug triage Mondays run late and steal from testing time", category: "could_improve", tag: "Other" },
    ],
  },

  // Ariel — mixed
  {
    username: "ariel",
    week: 1,
    message:
      "Shipped API refactor ahead of schedule and code review loop was tight. Tech debt and test coverage are concerns.",
    source: "slack",
    items: [
      { text: "Shipped the new API refactor ahead of schedule", category: "went_well", tag: "Development" },
      { text: "Code review feedback loop was tight", category: "went_well", tag: "Development" },
      { text: "Tech debt is piling up and slowing us down", category: "could_improve", tag: "Development" },
      { text: "Need better test coverage for critical paths", category: "could_improve", tag: "QA" },
    ],
  },
];

/* -------------------------------------------------- historical sessions */

export interface SeedHistoricalSession {
  sprintId: string;
  sentiment: string;
  synopsis: string;
  createdAt: string;
}

export const SEED_HISTORICAL_SESSIONS: SeedHistoricalSession[] = [
  {
    sprintId: "sprint-20",
    sentiment: "5",
    synopsis: "Solid sprint with some communication gaps.",
    createdAt: "2026-01-12T00:00:00.000Z",
  },
  {
    sprintId: "sprint-21",
    sentiment: "6",
    synopsis: "Improved processes led to better delivery.",
    createdAt: "2026-02-09T00:00:00.000Z",
  },
  {
    sprintId: "sprint-22",
    sentiment: "7",
    synopsis: "Strong execution with great team collaboration.",
    createdAt: "2026-03-09T00:00:00.000Z",
  },
  {
    sprintId: "sprint-23",
    sentiment: "5",
    synopsis: "Challenging sprint with scope creep and unclear requirements.",
    createdAt: "2026-03-30T00:00:00.000Z",
  },
];

/** Sprint id whose ActionItems populate the Home "My Actions" section. */
export const PREVIOUS_SPRINT_ID = "sprint-23";

/* ---------------------------------------- previous-sprint action items */

export interface SeedActionItem {
  description: string;
  status: "active" | "completed";
}

/**
 * Follow-ups assigned per user for the previous sprint (sprint-23).
 * 5 per user (4 active, 1 completed) so the Home dashboard's deterministic
 * picker always has enough to choose from.
 */
export const SEED_ACTION_ITEMS: Record<string, SeedActionItem[]> = {
  ariel: [
    { description: "Draft an API versioning RFC covering URL path, header, and deprecation policy. Share with the backend guild for review before next sprint planning.", status: "active" },
    { description: "Set up a feature-flag rollout plan for the new onboarding flow — 10% internal, 25% beta cohort, then full production once error rate stays flat for 48h.", status: "active" },
    { description: "Add regression tests covering the billing webhook edge cases we missed last month: retries, out-of-order events, and duplicate idempotency keys.", status: "active" },
    { description: "Schedule a cross-team sync with Platform to align on the new auth migration timeline and unblock the mobile rollout.", status: "active" },
    { description: "Audit the open tech-debt tickets in Linear and propose the top 3 candidates to tackle next sprint, with rough effort estimates.", status: "completed" },
  ],
  amy: [
    { description: "Put a time-boxed standup format in place — 10 minutes max, defer deep dives to follow-up threads.", status: "active" },
    { description: "Review the on-call rotation pages from last month, categorize by severity, and propose alert thresholds that reduce noise without missing real incidents.", status: "active" },
    { description: "Pilot feature flags with the next two medium-risk rollouts; document learnings for the rest of the org.", status: "active" },
    { description: "Book 1:1s with the two new hires to check in on ramp-up and collect onboarding friction points.", status: "active" },
    { description: "Write a short retro on the auth migration and share with engineering leadership.", status: "completed" },
  ],
  emily: [
    { description: "Refresh the onboarding flow mockups with the stakeholder feedback and hand off a clickable prototype for user testing.", status: "active" },
    { description: "Document the design review cadence and publish it to the team wiki so async reviewers know what's expected.", status: "active" },
    { description: "Kick off a UX audit of the dashboard — prioritize three friction points to address before the next release.", status: "active" },
    { description: "Pair with a frontend engineer to spec out the new empty-state illustrations and finalize the asset checklist.", status: "active" },
    { description: "Archive the deprecated Figma components and update the design system README.", status: "completed" },
  ],
  sam: [
    { description: "Stand up a staging environment that mirrors production data so the new CI pipeline can run full integration tests before merge.", status: "active" },
    { description: "Profile the slow endpoints flagged during the bug triage and propose a caching layer or query rewrite per hotspot.", status: "active" },
    { description: "Write clear acceptance criteria for the next three sprint stories so we don't enter sprint with fuzzy requirements again.", status: "active" },
    { description: "Reduce Monday meeting load: consolidate the three recurring status meetings into one 25-minute block.", status: "active" },
    { description: "Upgrade the Node runtime on the worker service and verify memory usage under load.", status: "completed" },
  ],
  morgan: [
    { description: "Document the rollback procedure for every service we own, including commands, contacts, and expected downtime.", status: "active" },
    { description: "Expand the regression suite with the three scenarios that bit us last release — including at least one chaos-style test.", status: "active" },
    { description: "Propose a standup format tweak to the EM: async updates Mon/Wed/Fri, live sync Tue/Thu only.", status: "active" },
    { description: "Run a brown-bag on knowledge-sharing tools the team adopted this sprint and capture the top 3 tips in the wiki.", status: "active" },
    { description: "Triaged and closed the stale QA bugs older than 90 days.", status: "completed" },
  ],
};

/**
 * When seeding ActionItems we pick N retro-item ids per action to populate
 * the "Associated retro items" count. Cycling this array per user produces
 * varied-but-stable counts across the 5 actions.
 */
export const SEED_ACTION_RELATED_COUNTS = [3, 2, 4, 2, 1] as const;

/* -------------------------------------------------- historical analytics */

/**
 * Fake per-sprint action totals shown on the "Actions by Sprint" bar chart.
 * Sprint 24 (the live sprint) is computed from the DB at render time; these
 * rows are sprints 17–23.
 */
export const HISTORICAL_ACTION_DATA: { sprint: string; assigned: number; completed: number }[] = [
  { sprint: "Sprint 17", assigned: 3, completed: 1 },
  { sprint: "Sprint 18", assigned: 4, completed: 2 },
  { sprint: "Sprint 19", assigned: 6, completed: 3 },
  { sprint: "Sprint 20", assigned: 4, completed: 3 },
  { sprint: "Sprint 21", assigned: 5, completed: 4 },
  { sprint: "Sprint 22", assigned: 3, completed: 3 },
  { sprint: "Sprint 23", assigned: 5, completed: 2 },
];

/**
 * Simulated per-person weekly sentiment for the current sprint.
 * The keys must match `SEED_USERS[*].name` exactly so the analytics client
 * can line up each line with a team member.
 */
export const WEEKLY_DATA: {
  week: string;
  "Amy Ng": number;
  "Emily Hu": number;
  "Sam Patel": number;
  "Morgan Lee": number;
  "Ariel Nichols": number;
}[] = [
  { week: "Week 1", "Amy Ng": 8, "Emily Hu": 7, "Sam Patel": 5, "Morgan Lee": 3, "Ariel Nichols": 7 },
  { week: "Week 2", "Amy Ng": 9, "Emily Hu": 6, "Sam Patel": 6, "Morgan Lee": 3, "Ariel Nichols": 8 },
  { week: "Week 3", "Amy Ng": 8, "Emily Hu": 7, "Sam Patel": 7, "Morgan Lee": 2, "Ariel Nichols": 7 },
  { week: "Week 4", "Amy Ng": 9, "Emily Hu": 8, "Sam Patel": 6, "Morgan Lee": 3, "Ariel Nichols": 6 },
];

/**
 * Hardcoded tag distributions for sprints 17–23. Values are "% of cards in
 * that sprint carrying the tag" (cards are multi-tagged, so columns may
 * sum > 100). Sprint 24 is computed from real DB rows at render time.
 */
export const HISTORICAL_TAG_TREND: { sprint: string; values: Record<RetroTag, number> }[] = [
  { sprint: "Sprint 17", values: { Development: 55, QA: 30, Spec: 22, "Design Solution": 12, Other: 28 } },
  { sprint: "Sprint 18", values: { Development: 48, QA: 35, Spec: 18, "Design Solution": 15, Other: 30 } },
  { sprint: "Sprint 19", values: { Development: 60, QA: 25, Spec: 28, "Design Solution": 10, Other: 22 } },
  { sprint: "Sprint 20", values: { Development: 52, QA: 30, Spec: 25, "Design Solution": 18, Other: 26 } },
  { sprint: "Sprint 21", values: { Development: 58, QA: 28, Spec: 20, "Design Solution": 22, Other: 20 } },
  { sprint: "Sprint 22", values: { Development: 50, QA: 32, Spec: 24, "Design Solution": 20, Other: 18 } },
  { sprint: "Sprint 23", values: { Development: 45, QA: 38, Spec: 30, "Design Solution": 16, Other: 24 } },
];
