import type { Metadata } from "next";
import { getPublicSiteSettings } from "@/backend/settings";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const settings = await getPublicSiteSettings();
  return <LoginForm louisJokeMode={settings.louisJokeMode} />;
}
