export type NowItem = {
  id: string;
  en: string;
  fr: string;
};

/** Easy to edit — short present-tense lines about current focus. */
export const nowItems: NowItem[] = [
  {
    id: "work",
    en: "Wrapping a digital / e-commerce internship and looking for what comes next.",
    fr: "Je termine un stage digital / e-commerce et je cherche la suite.",
  },
  {
    id: "build",
    en: "Building Claudette and harbi.eu as a personal workspace that actually sticks.",
    fr: "Je construis Claudette et harbi.eu comme un espace de travail perso qui tienne vraiment.",
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
