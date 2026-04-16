import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/board");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            RetroSlacker
          </h1>
          <p className="text-muted mt-2 text-sm">
            Team retrospectives, powered by AI
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
