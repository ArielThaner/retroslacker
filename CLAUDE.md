@AGENTS.md
# Project: Retro Slacker

This is a web app that is used for running team retrospectives. There is a Slack integration for users to enter their weekly update. AI will parse the user's Slack message and create "what went well" and "what could go better".

## Code Style

- TypeScript strict mode, no `any` types
- Use named exports, not default exports
- CSS: Tailwind utility classes, no custom CSS files
- Use components from https://github.com/creativetimofficial/material-tailwind.git whenever possible.

## Design Style

- The UI should be clean and modern based off tailwind css and material-tailwind components. Add micro interaction animations when appropreiate to add some flare.

## Commands

- `npm run dev`: Start development server (port 3000)
- `npm run test`: Run Jest tests
- `npm run test:e2e`: Run Playwright end-to-end tests
- `npm run lint`: ESLint check
- `npm run db:migrate`: Run Prisma migrations

## Architecture

- `/app`: Next.js App Router pages and layouts
- `/components/ui`: Reusable UI components
- `/lib`: Utilities and shared logic
- `/prisma`: Database schema and migrations
- `/app/api`: API routes