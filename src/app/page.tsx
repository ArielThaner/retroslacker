import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserInitials } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Landing / splash screen. Shown before login. Logged-in users skip
 * straight to the app; everyone else sees the wordmark, a preview of
 * the demo team, and a single CTA into the login form at /login.
 *
 * The three avatars are the "hero" personas — Amy, Emily, Ariel — to
 * give first-time visitors a face-of-the-team feel before they pick a
 * user to log in as.
 */

interface HeroUser {
  name: string;
  avatarUrl: string;
  avatarColor: string;
  jobTitle: string;
}

// Hard-coded to the three personas the landing page showcases. Kept
// inline (not imported from seed-data) so this component has no
// dependency on server-only Prisma seed data.
const HERO_USERS: HeroUser[] = [
  {
    name: "Amy Ng",
    avatarUrl: "/avatars/amy.png",
    avatarColor: "#3B82F6",
    jobTitle: "Product Designer",
  },
  {
    name: "Emily Hu",
    avatarUrl: "/avatars/emily.png",
    avatarColor: "#EC4899",
    jobTitle: "Product Designer",
  },
  {
    name: "Ariel Nichols",
    avatarUrl: "/avatars/ariel.png",
    avatarColor: "#10B981",
    jobTitle: "Product Designer",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/home");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center">
        {/* Large wordmark — 4× the header size (52px) so it reads as
            the hero element of the splash. */}
        <img
          src="/logo.svg"
          alt="RetroSlacker"
          className="h-14 sm:h-16 w-auto mb-4"
          width={418}
          height={52}
        />
        <p className="text-muted text-base sm:text-lg text-center mb-12">
          Team retrospectives, powered by AI
        </p>

        {/* Hero avatars — Amy, Emily, Ariel. Each is a simple avatar
            tile with name + job title underneath. Using <img> so the
            PNGs in /public/avatars/ render; falling back to a colored
            initials circle if the image is missing. */}
        <div className="flex flex-wrap items-start justify-center gap-8 sm:gap-12 mb-12">
          {HERO_USERS.map((u) => (
            <div key={u.name} className="flex flex-col items-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-md ring-4 ring-white">
                {/* Colored-initials fallback sits behind the <img>. If
                    the PNG 404s in prod the initials still read. */}
                <div
                  className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: u.avatarColor }}
                >
                  {getUserInitials(u.name)}
                </div>
                <img
                  src={u.avatarUrl}
                  alt={u.name}
                  className="relative w-full h-full object-cover"
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {u.name}
              </p>
              <p className="text-xs text-muted">{u.jobTitle}</p>
            </div>
          ))}
        </div>

        <a
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-white text-base font-semibold rounded-xl transition-colors shadow-lg"
        >
          Go to App
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </div>
    </main>
  );
}
