"use server";

import { login, logout } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const user = await login(username, password);
  if (!user) {
    return { error: "Invalid username or password" };
  }

  redirect("/board");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
