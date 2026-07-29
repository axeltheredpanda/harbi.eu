export type Locale = "fr" | "en";

export type LandingCopy = {
  available: string;
  bio: string;
  writeToMe: string;
  readResume: string;
  navWork: string;
  navNotes: string;
  navNews: string;
  navNow: string;
  navCv: string;
  navContact: string;
  navLogin: string;
  workTitle: string;
  workIntro: string;
  cvTitle: string;
  cvIntro: string;
  cvPdf: string;
  cvScrollHint: string;
  notYetOnView: string;
  studioCredit: string;
  skillsTitle: string;
  skillsIntro: string;
  jokeSkill: string;
  contactTitle: string;
  contactBody: string;
  redbulls: string;
  relationshipLabel: string;
  statusSingle: string;
  statusDating: string;
  days: string;
  fuelLabel: string;
  fuelUnit: string;
  fuelRange: string;
  fuelTrend: string;
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
    stack?: string[];
    years?: string;
  }[];
  skills: string[];
  statusJokes: string[];
};

/** Shared across locales — English one-liners for the relationship-status banner. */
export const STATUS_JOKES = [
  "(main quest: fix one bug, create three more)",
  "(currently arguing with a semicolon)",
  "(status: it works on my machine)",
  "(side quest: understanding my own code from last week)",
  "(currently proposing to Claude)",
  "(debugging in production like it's fine)",
  "(git blame led me to myself)",
  "(currently negotiating with my own logic)",
  "(main quest: ship it and pray)",
  "(side quest: reading the documentation (never))",
  "(running on vibes and RedBull)",
  "(caffeine level: critical)",
  "(currently 60% coffee by volume)",
  "(main quest: stay hydrated)",
  "(side quest: sleep, eventually)",
  "(energy source: spite and espresso)",
  "(currently on my third espresso, first thought)",
  "(main quest: survive until lunch)",
  "(hydration status: theoretical)",
  "(currently loading personality update)",
  "(plot twist pending)",
  "(main quest: adulting (in progress))",
  "(achievement unlocked: mild competence)",
  "(currently buffering)",
  "(status: fine, thanks for asking)",
  "(xp gained, wisdom optional)",
  "(currently patching my own bugs, personality edition)",
  "(main quest: figure out what I'm doing)",
  "(side quest: remembering why I walked into this room)",
  "(status: 12% together, 88% caffeine)",
  "(currently rebooting motivation)",
  "(main quest: become a functional adult (beta version))",
  "(currently overtaking my to-do list)",
  "(main quest: find a manual gearbox that isn't dying)",
  "(pit stop in progress)",
  "(redline emotional state)",
  "(main quest: brake later, think faster)",
  "(status: slightly over the limit, allegedly)",
  "(portfolio status: concentrated and concerned)",
  "(currently watching numbers go down)",
  "(main quest: diversify (someday))",
  "(side quest: understanding my own PEA statement)",
  "(currently up 2%, emotionally unstable)",
  "(main quest: buy low, panic high)",
  "(relationship status: single, undefeated)",
  "(currently swiping right on productivity)",
  "(main quest: reply to that text from three days ago)",
  "(side quest: remembering to call people back)",
  "(status: emotionally unavailable, technically online)",
  "(currently ghosting my inbox)",
  "(main quest: text back within the week)",
  "(currently losing my mind, tastefully)",
  "(boss fight: Monday)",
  "(status: functioning, allegedly)",
  "(currently speedrunning existence)",
  "(error 404: motivation not found)",
  "(currently vibing, technically working)",
  "(status: held together by habit)",
  "(main quest: don't panic (in progress))",
  "(side quest: remain calm under mild pressure)",
  "(currently improvising, confidently)",
  "(status: mostly a professional)",
  "(main quest: pretend I have a plan)",
  "(currently outsourcing my thinking to Claude)",
  "(side quest: not googling my own symptoms)",
  "(status: caffeinated and unbothered)",
  "(currently losing by default)",
  "(main quest: stay ahead of the deadline (barely))",
  "(side quest: ignoring the deadline entirely)",
  "(status: chaotic but organized about it)",
  "(currently overthinking a simple decision)",
  "(currently in a staring contest with my calendar)",
  "(status: booked, blessed, slightly stressed)",
  "(main quest: say no to one more thing)",
  "(currently negotiating with my own deadlines)",
  "(side quest: finishing what I started yesterday)",
] as const;

export const dictionaries: Record<Locale, LandingCopy> = {
  fr: {
    available: "Ouvert aux opportunités",
    bio: "Fraîchement sorti d'un stage digital / e-commerce, je me bats encore avec un outil IA interne qui perd presque toujours. Je construis toujours le logiciel avec soin — du schéma à l'écran — et je soigne le nommage, la structure, et la phrase qu'un produit laisse derrière lui.",
    writeToMe: "Écrivez-moi",
    readResume: "Lire le CV",
    navWork: "Travail",
    navNotes: "Notes",
    navNews: "News",
    navNow: "Maintenant",
    navCv: "CV",
    navContact: "Contact",
    navLogin: "Connexion",
    workTitle: "Travaux choisis",
    workIntro: "Une courte étagère. Chaque pièce est quelque chose que j'ai façonné moi-même, ou presque.",
    cvTitle: "Parcours",
    cvIntro:
      "Quelques jalons sur une frise — continuez à scroller pour avancer. Le PDF reste disponible à côté.",
    cvPdf: "Télécharger le PDF",
    cvScrollHint: "Scroller pour explorer",
    notYetOnView: "Pas encore exposé.",
    studioCredit:
      "Les pièces de cette étagère sont construites sous Axel Project, un studio à deux.",
    skillsTitle: "Comment je travaille",
    skillsIntro: "La stack que j'utilise quand le problème est réel.",
    jokeSkill: "Excel — niveau expert (post-traumatique)",
    contactTitle: "Parlons-en",
    contactBody:
      "Si quelque chose ici résonne — un poste, une collaboration, une question — envoyez un mot. Je lis tout ce qui arrive.",
    redbulls: "Red Bulls",
    relationshipLabel: "Statut",
    statusSingle: "célibataire",
    statusDating: "en couple",
    days: "jours",
    fuelLabel: "E10",
    fuelUnit: "€/L",
    fuelRange: "fourchette",
    fuelTrend: "1j",
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
        name: "Axel CRM",
        wink: "Le seul produit ici qui a refusé de porter ma palette.",
        description:
          "Un CRM pour les PME qui ont dépassé les tableurs sans être prêtes pour l'entreprise. Backend Java, frontend React, Supabase et Stripe en dessous. Construit et utilisé avec de vrais clients, pas conçu dans le vide.",
      },
    ],
    skills: [
      "Next.js, React, TypeScript, Tailwind",
      "Supabase, PostgreSQL, Node",
      "Vercel, Git, API Anthropic",
    ],
    // Shared English pool — intentional for both locales
    statusJokes: [...STATUS_JOKES],
  },
  en: {
    available: "Available for opportunities",
    bio: "Fresh off a digital / e-commerce internship, currently arguing with an internal AI tool that keeps losing. I still build software the careful way — schema to screen — and care about naming, structure, and the sentence a product leaves behind.",
    writeToMe: "Write to me",
    readResume: "Read the résumé",
    navWork: "Work",
    navNotes: "Notes",
    navNews: "News",
    navNow: "Now",
    navCv: "CV",
    navContact: "Contact",
    navLogin: "Login",
    workTitle: "Selected work",
    workIntro: "A short shelf. Each piece is something I shaped myself, or nearly so.",
    cvTitle: "Path",
    cvIntro:
      "A few milestones on a track — keep scrolling to move along. The PDF is still available beside the section.",
    cvPdf: "Download PDF",
    cvScrollHint: "Scroll to explore",
    notYetOnView: "Not yet on view.",
    studioCredit:
      "Pieces on this shelf are built under Axel Project, a two-person studio.",
    skillsTitle: "How I work",
    skillsIntro: "The stack I reach for when the problem is real.",
    jokeSkill: "Excel — expert level (post-traumatic)",
    contactTitle: "Let's talk",
    contactBody:
      "If something here resonates — a role, a collaboration, a question — send a note. I read everything that arrives.",
    redbulls: "Red Bulls since launch",
    relationshipLabel: "Relationship status",
    statusSingle: "single",
    statusDating: "dating",
    days: "days",
    fuelLabel: "E10 France",
    fuelUnit: "€/L",
    fuelRange: "range",
    fuelTrend: "1d",
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
        name: "Axel CRM",
        wink: "The one product here that refused to wear my palette.",
        description:
          "A CRM built for SMBs who've outgrown spreadsheets but aren't ready for enterprise software. Java backend, React frontend, Supabase and Stripe underneath. Built and used alongside real customers, not designed in a vacuum.",
      },
    ],
    skills: [
      "Next.js, React, TypeScript, Tailwind",
      "Supabase, PostgreSQL, Node",
      "Vercel, Git, Anthropic API",
    ],
    statusJokes: [...STATUS_JOKES],
  },
};

export function detectLocale(navLang?: string | null): Locale {
  if (!navLang) return "fr";
  const primary = navLang.toLowerCase().split(",")[0]?.trim() ?? "";
  if (primary.startsWith("en")) return "en";
  return "fr";
}
