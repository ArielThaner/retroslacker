import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH
  ? process.env.DATABASE_PATH
  : path.join(process.cwd(), "dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${dbPath}` }),
});

const SPRINT_ID = "sprint-24";

async function main() {
  // Clear existing data
  await prisma.actionItem.deleteMany();
  await prisma.retroItem.deleteMany();
  await prisma.retroSession.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const alex = await prisma.user.create({
    data: { name: "Amy Ng", username: "amy", password: "123", avatarColor: "#3B82F6", avatarUrl: "/avatars/amy.png", jobTitle: "Engineering Manager" },
  });
  const emily = await prisma.user.create({
    data: { name: "Emily Hu", username: "emily", password: "123", avatarColor: "#8B5CF6", avatarUrl: "/avatars/emily.png", jobTitle: "Product Designer" },
  });
  const sam = await prisma.user.create({
    data: { name: "Sam Patel", username: "sam", password: "password", avatarColor: "#10B981", jobTitle: "Backend Engineer" },
  });
  const morgan = await prisma.user.create({
    data: { name: "Morgan Lee", username: "morgan", password: "password", avatarColor: "#F59E0B", jobTitle: "QA Engineer" },
  });
  const ariel = await prisma.user.create({
    data: { name: "Ariel Nichols", username: "ariel", password: "123", avatarColor: "#EF4444", avatarUrl: "/avatars/ariel.png", jobTitle: "Software Engineer" },
  });

  // Seed retro items for Alex (demo user) - two Slack messages + one manual item
  const alexMsg1 = "Deployment went smoothly this week and the new monitoring dashboard caught an issue before users noticed. But standups are dragging on too long.";
  const alexMsg2 = "Really happy with how the team handled the auth migration. The on-call rotation needs some work though, I got paged three times for non-critical stuff.";
  await prisma.retroItem.createMany({
    data: [
      { userId: alex.id, sprintId: SPRINT_ID, content: alexMsg1, wentWell: "Deployment went smoothly this week", couldImprove: "", category: "went_well", source: "slack" },
      { userId: alex.id, sprintId: SPRINT_ID, content: alexMsg1, wentWell: "New monitoring dashboard caught an issue before users noticed", couldImprove: "", category: "went_well", source: "slack" },
      { userId: alex.id, sprintId: SPRINT_ID, content: alexMsg1, wentWell: "", couldImprove: "Standups are dragging on too long", category: "could_improve", source: "slack" },
      { userId: alex.id, sprintId: SPRINT_ID, content: alexMsg2, wentWell: "Team handled the auth migration really well", couldImprove: "", category: "went_well", source: "slack" },
      { userId: alex.id, sprintId: SPRINT_ID, content: alexMsg2, wentWell: "", couldImprove: "On-call rotation needs work — too many non-critical pages", category: "could_improve", source: "slack" },
      { userId: alex.id, sprintId: SPRINT_ID, content: "We should adopt feature flags for safer rollouts", wentWell: "", couldImprove: "We should adopt feature flags for safer rollouts", category: "could_improve", source: "manual" },
    ],
  });

  // Seed retro items for Emily - one Slack message with mixed items
  const emilyMsg = "Code reviews were thorough this sprint and pair programming really helped. But I kept getting pulled between tasks and the API docs were outdated.";
  await prisma.retroItem.createMany({
    data: [
      { userId: emily.id, sprintId: SPRINT_ID, content: emilyMsg, wentWell: "Code reviews were thorough this sprint", couldImprove: "", category: "went_well", source: "slack" },
      { userId: emily.id, sprintId: SPRINT_ID, content: emilyMsg, wentWell: "Pair programming sessions were really productive", couldImprove: "", category: "went_well", source: "slack" },
      { userId: emily.id, sprintId: SPRINT_ID, content: emilyMsg, wentWell: "", couldImprove: "Too many context switches between tasks", category: "could_improve", source: "slack" },
      { userId: emily.id, sprintId: SPRINT_ID, content: emilyMsg, wentWell: "", couldImprove: "Documentation was outdated for the API changes", category: "could_improve", source: "slack" },
    ],
  });

  // Seed retro items for Sam - one Slack message
  const samMsg = "The new CI pipeline is a game changer and bug triage is working great. Requirements were fuzzy at sprint start though, and Monday mornings have too many meetings.";
  await prisma.retroItem.createMany({
    data: [
      { userId: sam.id, sprintId: SPRINT_ID, content: samMsg, wentWell: "New CI pipeline saved us a lot of time", couldImprove: "", category: "went_well", source: "slack" },
      { userId: sam.id, sprintId: SPRINT_ID, content: samMsg, wentWell: "Bug triage process is working well", couldImprove: "", category: "went_well", source: "slack" },
      { userId: sam.id, sprintId: SPRINT_ID, content: samMsg, wentWell: "", couldImprove: "Requirements were unclear at sprint start", category: "could_improve", source: "slack" },
      { userId: sam.id, sprintId: SPRINT_ID, content: samMsg, wentWell: "", couldImprove: "Too many meetings on Monday mornings", category: "could_improve", source: "slack" },
    ],
  });

  // Seed retro items for Morgan - one Slack message
  const morganMsg = "Loved the collaboration on the auth feature and the knowledge sharing sessions. Standups need to be shorter and we need better rollback procedures for deploys.";
  await prisma.retroItem.createMany({
    data: [
      { userId: morgan.id, sprintId: SPRINT_ID, content: morganMsg, wentWell: "Team collaboration was great on the auth feature", couldImprove: "", category: "went_well", source: "slack" },
      { userId: morgan.id, sprintId: SPRINT_ID, content: morganMsg, wentWell: "Knowledge sharing sessions helped onboard new tools", couldImprove: "", category: "went_well", source: "slack" },
      { userId: morgan.id, sprintId: SPRINT_ID, content: morganMsg, wentWell: "", couldImprove: "Standups are too long and unfocused", category: "could_improve", source: "slack" },
      { userId: morgan.id, sprintId: SPRINT_ID, content: morganMsg, wentWell: "", couldImprove: "Deployment process needs better rollback procedures", category: "could_improve", source: "slack" },
    ],
  });

  // Seed retro items for Taylor - one Slack message
  const arielMsg = "Shipped the new API refactor ahead of schedule and the code review feedback loop was tight. Tech debt is becoming a real drag though and we need more test coverage on critical paths.";
  await prisma.retroItem.createMany({
    data: [
      { userId: ariel.id, sprintId: SPRINT_ID, content: arielMsg, wentWell: "Shipped the new API refactor ahead of schedule", couldImprove: "", category: "went_well", source: "slack" },
      { userId: ariel.id, sprintId: SPRINT_ID, content: arielMsg, wentWell: "Code review feedback loop was tight", couldImprove: "", category: "went_well", source: "slack" },
      { userId: ariel.id, sprintId: SPRINT_ID, content: arielMsg, wentWell: "", couldImprove: "Tech debt is piling up and slowing us down", category: "could_improve", source: "slack" },
      { userId: ariel.id, sprintId: SPRINT_ID, content: arielMsg, wentWell: "", couldImprove: "Need better test coverage for critical paths", category: "could_improve", source: "slack" },
    ],
  });

  // Create a pending retro session
  await prisma.retroSession.create({
    data: { sprintId: SPRINT_ID, status: "pending" },
  });

  console.log("Seed data created successfully!");
  console.log(`Users: ${alex.name}, ${emily.name}, ${sam.name}, ${morgan.name}, ${ariel.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
