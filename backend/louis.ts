/** Target of the Louis prank - keep in sync with Settings copy. */
export const LOUIS_EMAIL = "louis.vedovato@essec.edu";

export function isLouisEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === LOUIS_EMAIL;
}

/** French for FR and EN - intentional, no translation. */
export const LOUIS_COPY = {
  q1: "T'appelles tu Louis ?",
  q2: "Possèdes-tu une 206 ?",
  q3: "Veux-tu m'épouser ?",
  oui: "Oui",
  non: "Non",
  passwordHint: "Ton mot de passe c'est le siren Axel.",
  wrong: "Mauvaise réponse. Réessaie, champion.",
  claudetteBlock:
    "Tu n'exploiteras pas ma clé API. Claudette reste fermée pour toi, Louis.",
  settingsTitle: "Blague Louis",
  settingsDetail:
    "Active le quiz sur /login et bloque l'envoi Claudette pour louis.vedovato@essec.edu.",
  settingsOn: "Mode blague allumé",
  settingsOff: "Mode blague éteint",
} as const;
