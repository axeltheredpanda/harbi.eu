"use client";

import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () =>
    import("@/app/(private)/command-palette").then((m) => ({
      default: m.CommandPalette,
    })),
  { ssr: false },
);

/** Lazy command palette — keeps private route shells lighter until Ctrl+K. */
export function CommandPaletteLazy() {
  return <CommandPalette />;
}
