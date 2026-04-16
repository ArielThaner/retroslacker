"use server";

import { login, logout } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const user = await login(username, password);
    if (!user) {
      return { error: "Invalid username or password" };
    }
  } catch (err) {
    // Re-throw redirects (Next.js uses errors for redirects)
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Login failed: ${message}` };
  }

  redirect("/board");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
