import { Analytics } from "@/frontend/analytics";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
