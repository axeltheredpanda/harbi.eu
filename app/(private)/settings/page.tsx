import { getPublicSiteSettings } from "@/backend/settings";
import { getClaudetteSettings } from "@/backend/claudette/settings";
import { listAllMilestones } from "@/backend/cv/milestones";
import { listMemories } from "@/backend/chat/memories";
import { SettingsForm } from "./settings-form";
import { ClaudetteSettingsSection } from "./claudette-settings";
import { CvSettingsPanel } from "./cv-settings-panel";
import { MemoryPanel } from "./memory-panel";
import { SettingsShell } from "./settings-shell";

export default async function SettingsPage() {
  const [site, claudette, milestones, memories] = await Promise.all([
    getPublicSiteSettings(),
    getClaudetteSettings(),
    listAllMilestones().catch(() => []),
    listMemories().catch(() => []),
  ]);

  return (
    <SettingsShell
      site={<SettingsForm initial={site} />}
      cv={<CvSettingsPanel initial={milestones} />}
      claudette={<ClaudetteSettingsSection initial={claudette} />}
      memory={<MemoryPanel initial={memories} />}
    />
  );
}
