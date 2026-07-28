import { getPublicSiteSettings } from "@/backend/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getPublicSiteSettings();
  return <SettingsForm initial={settings} />;
}
