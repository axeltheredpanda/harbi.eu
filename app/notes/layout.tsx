export default function NotesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="public-wax-cursor">{children}</div>;
}
