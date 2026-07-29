import { getPublicSiteSettings } from "@/backend/settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await getPublicSiteSettings();
  return <LoginForm louisJokeMode={settings.louisJokeMode} />;
}
