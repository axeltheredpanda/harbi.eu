export type Locale = "fr" | "en";

export type LandingCopy = {
  available: string;
  bio: string;
  writeToMe: string;
  readResume: string;
  navWork: string;
  navNotes: string;
  navNow: string;
  navContact: string;
  navLogin: string;
  workTitle: string;
  workIntro: string;
  linkSoon: string;
  skillsTitle: string;
  skillsIntro: string;
  jokeSkill: string;
  contactTitle: string;
  contactBody: string;
  redbulls: string;
  relationship: string;
  days: string;
  exitRally: string;
  nowTitle: string;
  notesTitle: string;
  notesIntro: string;
  notesRead: string;
  notesAll: string;
  githubActivity: string;
  langFr: string;
  langEn: string;
  projects: {
    name: string;
    wink: string;
    description: string;
  }[];
  skills: string[];
  statusJokes: string[];
};

export const dictionaries: Record<Locale, LandingCopy> = {
  fr: {
    available: "Ouvert aux opportunités",
    bio: "Fraîchement sorti d'un stage digital / e-commerce, je me bats encore avec un outil IA interne qui perd presque toujours. Je construis toujours le logiciel avec soin — du schéma à l'écran — et je soigne le nommage, la structure, et la phrase qu'un produit laisse derrière lui.",
    writeToMe: "Écrivez-moi",
    readResume: "Lire le CV",
    navWork: "Travail",
    navNotes: "Notes",
    navNow: "Maintenant",
    navContact: "Contact",
    navLogin: "Connexion",
    workTitle: "Travaux choisis",
    workIntro: "Une courte étagère. Chaque pièce est quelque chose que j'ai façonné moi-même, ou presque.",
    linkSoon: "Lien bientôt.",
    skillsTitle: "Comment je travaille",
    skillsIntro: "La stack que j'utilise quand le problème est réel.",
    jokeSkill: "Excel — niveau expert (post-traumatique)",
    contactTitle: "Parlons-en",
    contactBody:
      "Si quelque chose ici résonne — un poste, une collaboration, une question — envoyez un mot. Je lis tout ce qui arrive.",
    redbulls: "Red Bulls depuis le lancement",
    relationship: "Statut relationnel · célibataire",
    days: "jours",
    exitRally: "Quitter le mode rallye",
    nowTitle: "Maintenant",
    notesTitle: "Notes",
    notesIntro: "Courtes réflexions, écrites pour être lues — pas pour remplir un blog.",
    notesRead: "Lire",
    notesAll: "Toutes les notes",
    githubActivity: "Sur GitHub",
    langFr: "FR",
    langEn: "EN",
    projects: [
      {
        name: "Axel Project",
        wink: "Nommé d'après moi — pas par vanité, par responsabilité.",
        description:
          "Un produit de bout en bout : schéma, interface, et la colle ennuyeuse entre les deux. La phrase publique pour qui ça sert se précise encore.",
      },
      {
        name: "Astraia",
        wink: "Le genre d'idée qui semblait simple au tableau, puis a poliment refusé.",
        description:
          "Travail en cours sur un problème ciblé. Stack et résultats ici dès que la forme se stabilise.",
      },
    ],
    skills: [
      "Next.js, React, TypeScript, Tailwind",
      "Supabase, PostgreSQL, Node",
      "Vercel, Git, API Anthropic",
    ],
    statusJokes: [
      "(en train de perdre la tête)",
      "(buffer émotionnel…)",
      "(c'est compliqué avec mon agenda)",
      "(ouvert aux suggestions, fermé aux situationships)",
      "(quête principale : rester hydraté)",
      "(rebondissement en attente)",
      "(sur des vibes et du Red Bull)",
      "(ne pas me percevoir)",
    ],
  },
  en: {
    available: "Available for opportunities",
    bio: "Fresh off a digital / e-commerce internship, currently arguing with an internal AI tool that keeps losing. I still build software the careful way — schema to screen — and care about naming, structure, and the sentence a product leaves behind.",
    writeToMe: "Write to me",
    readResume: "Read the résumé",
    navWork: "Work",
    navNotes: "Notes",
    navNow: "Now",
    navContact: "Contact",
    navLogin: "Login",
    workTitle: "Selected work",
    workIntro: "A short shelf. Each piece is something I shaped myself, or nearly so.",
    linkSoon: "Link soon.",
    skillsTitle: "How I work",
    skillsIntro: "The stack I reach for when the problem is real.",
    jokeSkill: "Excel — expert level (post-traumatic)",
    contactTitle: "Let's talk",
    contactBody:
      "If something here resonates — a role, a collaboration, a question — send a note. I read everything that arrives.",
    redbulls: "Red Bulls since launch",
    relationship: "Relationship status · single",
    days: "days",
    exitRally: "Exit rally mode",
    nowTitle: "Now",
    notesTitle: "Notes",
    notesIntro: "Short reflections, written to be read — not to fill a blog.",
    notesRead: "Read",
    notesAll: "All notes",
    githubActivity: "On GitHub",
    langFr: "FR",
    langEn: "EN",
    projects: [
      {
        name: "Axel Project",
        wink: "Named after myself — not out of vanity, out of accountability.",
        description:
          "An end-to-end product: schema, interface, and the boring glue between them. Still tightening the public one-liner for who it serves.",
      },
      {
        name: "Astraia",
        wink: "The kind of idea that looked simple on a whiteboard and then politely refused.",
        description:
          "Work in progress on a focused problem space. Stack and outcomes land here once the shape stops shifting.",
      },
    ],
    skills: [
      "Next.js, React, TypeScript, Tailwind",
      "Supabase, PostgreSQL, Node",
      "Vercel, Git, Anthropic API",
    ],
    statusJokes: [
      "(currently losing my mind)",
      "(emotionally buffering…)",
      "(status: it's complicated with my calendar)",
      "(open to suggestions, closed to situationships)",
      "(main quest: stay hydrated)",
      "(plot twist pending)",
      "(running on vibes and Red Bull)",
      "(do not perceive)",
    ],
  },
};

export function detectLocale(navLang?: string | null): Locale {
  if (!navLang) return "fr";
  const primary = navLang.toLowerCase().split(",")[0]?.trim() ?? "";
  if (primary.startsWith("en")) return "en";
  return "fr";
}
