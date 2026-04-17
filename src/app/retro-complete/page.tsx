import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RetroCompleteClient } from "./retro-complete-client";

export const dynamic = "force-dynamic";

export default async function RetroCompletePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return <RetroCompleteClient userName={user.name} />;
}
