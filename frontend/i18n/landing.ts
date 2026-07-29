export type LandingCopy = {
  available: string;
  bio: string;
  writeToMe: string;
  readResume: string;
  navWork: string;
  navNotes: string;
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
  listeningTo: string;
  onlineSince: string;
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

/** English one-liners for the relationship-status banner. */
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

/** Site copy - English only. */
export const copy: LandingCopy = {
  available: "Available for opportunities",
  bio: "Fresh off a digital / e-commerce internship, currently arguing with an internal AI tool that keeps losing. I still build software the careful way - schema to screen - and care about naming, structure, and the sentence a product leaves behind.",
  writeToMe: "Write to me",
  readResume: "Read the résumé",
  navWork: "Work",
  navNotes: "Notes",
  navNow: "Now",
  navCv: "CV",
  navContact: "Contact",
  navLogin: "Login",
  workTitle: "Selected work",
  workIntro: "A short shelf. Each piece is something I shaped myself, or nearly so.",
  cvTitle: "Path",
  cvIntro:
    "A few milestones on a track - keep scrolling to move along. The PDF is still available beside the section.",
  cvPdf: "Download PDF",
  cvScrollHint: "Scroll to explore",
  notYetOnView: "Not yet on view.",
  studioCredit:
    "Pieces on this shelf are built under Axel Project, a two-person studio.",
  skillsTitle: "How I work",
  skillsIntro: "The stack I reach for when the problem is real.",
  jokeSkill: "cursor as well, but dont tell claude",
  contactTitle: "Let's talk",
  contactBody:
    "If something here resonates - a role, a collaboration, a question - send a note. I read everything that arrives.",
  redbulls: "Red Bulls",
  relationshipLabel: "Status",
  listeningTo: "Listening to",
  onlineSince: "online for",
  statusSingle: "single",
  statusDating: "dating",
  days: "days",
  fuelLabel: "E10",
  fuelUnit: "€/L",
  fuelRange: "range",
  fuelTrend: "1d",
  exitRally: "Exit rally mode",
  nowTitle: "Now",
  notesTitle: "Notes",
  notesIntro: "Short reflections, written to be read - not to fill a blog.",
  notesRead: "Read",
  notesAll: "All notes",
  githubActivity: "On GitHub",
  projects: [
    {
      name: "Axel CRM",
      wink: "The one product here that refused to wear my palette.",
      description:
        "A CRM built for SMBs who've outgrown spreadsheets but aren't ready for enterprise software. Java backend, React frontend, Supabase and Stripe underneath. Built and used alongside real customers, not designed in a vacuum.",
    },
  ],
  skills: ["Claude", "Claude Code", "Claude Design"],
  statusJokes: [...STATUS_JOKES],
};
