import { Analytics } from "@/frontend/analytics";

export default function NotesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
