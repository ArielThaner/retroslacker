import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "retro_session";
const SPRINT_ID = "sprint-24";

export { SPRINT_ID };

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  const userId = parseInt(sessionCookie.value, 10);
  if (isNaN(userId)) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user || user.password !== password) return null;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(user.id), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return user;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
