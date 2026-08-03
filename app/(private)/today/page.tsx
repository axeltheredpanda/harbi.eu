import { createClient } from "@/backend/supabase/server";
import {
  getOrCreateDailyNote,
  listRecentNotes,
  pickResurfaceNote,
} from "@/backend/jarvis/notes";
import { getTodaysBriefing } from "@/backend/jarvis/briefing";
import { TodayView } from "./today-view";

export const metadata = {
  title: "Today",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [briefing, recent, resurfaced, daily] = await Promise.all([
    user ? getTodaysBriefing(user.id) : Promise.resolve(null),
    listRecentNotes(16).catch(() => []),
    pickResurfaceNote().catch(() => null),
    getOrCreateDailyNote().catch(() => null),
  ]);

  return (
    <TodayView
      briefing={briefing}
      recent={recent}
      resurfaced={resurfaced}
      dailyNoteId={daily?.id ?? null}
    />
  );
}
