export type ClaudetteProfile = {
  firstName: string;
  age: string;
  location: string;
  languages: string;
  studies: string;
  work: string;
  companies: string;
  projects: string;
  communicationStyle: string;
  interests: string;
  vehicles: string;
  people: string;
  other: string;
};

export type ClaudetteSettings = {
  webSearchEnabled: boolean;
  profile: ClaudetteProfile;
};

export const EMPTY_PROFILE: ClaudetteProfile = {
  firstName: "",
  age: "",
  location: "",
  languages: "",
  studies: "",
  work: "",
  companies: "",
  projects: "",
  communicationStyle: "",
  interests: "",
  vehicles: "",
  people: "",
  other: "",
};

export const PROFILE_FIELDS: {
  key: keyof ClaudetteProfile;
  label: string;
  hint: string;
  rows?: number;
}[] = [
  { key: "firstName", label: "First name", hint: "How Claudette should address you" },
  { key: "age", label: "Age", hint: "Optional — only if you want it known" },
  { key: "location", label: "Location", hint: "City, country, timezone clues" },
  { key: "languages", label: "Languages", hint: "Native / levels" },
  { key: "studies", label: "Studies", hint: "School, programme, exchange" },
  { key: "work", label: "Work", hint: "Job, internship, manager", rows: 3 },
  { key: "companies", label: "Companies", hint: "Axel Project, holding, RCS…", rows: 3 },
  { key: "projects", label: "Projects", hint: "Products, side projects, stacks", rows: 4 },
  {
    key: "communicationStyle",
    label: "Communication",
    hint: "tu/vous, tone, formatting rules",
    rows: 3,
  },
  { key: "interests", label: "Interests", hint: "Cars, motorsport, tech, finance…", rows: 3 },
  { key: "vehicles", label: "Vehicles", hint: "Current car, search criteria", rows: 2 },
  { key: "people", label: "People", hint: "Associates, manager — only as needed", rows: 2 },
  { key: "other", label: "Other", hint: "Anything else worth remembering", rows: 3 },
];

export function normalizeProfile(raw: unknown): ClaudetteProfile {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...EMPTY_PROFILE };
  for (const key of Object.keys(EMPTY_PROFILE) as (keyof ClaudetteProfile)[]) {
    const value = src[key];
    out[key] = typeof value === "string" ? value.trim() : "";
  }
  return out;
}

export function profileHasContent(profile: ClaudetteProfile): boolean {
  return Object.values(profile).some((v) => v.trim().length > 0);
}

/** Compact block for the system prompt — only non-empty fields. */
export function formatProfileForPrompt(profile: ClaudetteProfile): string {
  const lines: string[] = [];
  const push = (label: string, value: string) => {
    const v = value.trim();
    if (v) lines.push(`- ${label}: ${v}`);
  };
  push("First name", profile.firstName);
  push("Age", profile.age);
  push("Location", profile.location);
  push("Languages", profile.languages);
  push("Studies", profile.studies);
  push("Work", profile.work);
  push("Companies", profile.companies);
  push("Projects", profile.projects);
  push("Communication preferences", profile.communicationStyle);
  push("Interests", profile.interests);
  push("Vehicles", profile.vehicles);
  push("People", profile.people);
  push("Other", profile.other);
  return lines.join("\n");
}
