import { redirect } from "next/navigation";
import { getOrCreateDailyNote } from "@/backend/jarvis/notes";

export default async function DailyRedirectPage() {
  const note = await getOrCreateDailyNote();
  redirect(`/today/notes/${note.id}`);
}
