export type NowItem = {
  id: string;
  en: string;
  fr: string;
};

/** Easy to edit — short present-tense lines about current focus. */
export const nowItems: NowItem[] = [
  {
    id: "work",
    en: "Intern @ Remy Cointreau as Digital Web & E-Commerce Officer.",
    fr: "Stagiaire @ Rémy Cointreau — Digital Web & E-Commerce Officer.",
  },
  {
    id: "axel",
    en: "Making Axel Project somewhat profitable.",
    fr: "Je rends Axel Project un peu rentable.",
  },
  {
    id: "cars",
    en: "Casually hunting for a used car without falling for the first shiny listing.",
    fr: "Je cherche une voiture d'occasion sans me faire avoir par la première annonce brillante.",
  },
  {
    id: "place",
    en: "Based in France, online more than anywhere else.",
    fr: "Basé en France, plus souvent en ligne qu'ailleurs.",
  },
];
