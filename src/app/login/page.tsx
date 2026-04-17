import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "../login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/home");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="RetroSlacker"
            className="h-8 w-auto mx-auto"
            width={418}
            height={52}
          />
          <p className="text-muted mt-3 text-sm">
            Team retrospectives, powered by AI
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
