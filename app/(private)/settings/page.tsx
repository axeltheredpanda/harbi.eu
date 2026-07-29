import { getPublicSiteSettings } from "@/backend/settings";
import { getClaudetteSettings } from "@/backend/claudette/settings";
import { SettingsForm } from "./settings-form";
import { ClaudetteSettingsSection } from "./claudette-settings";

export default async function SettingsPage() {
  const [site, claudette] = await Promise.all([
    getPublicSiteSettings(),
    getClaudetteSettings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-2 pb-16">
      <SettingsForm initial={site} />
      <ClaudetteSettingsSection initial={claudette} />
    </div>
  );
}
