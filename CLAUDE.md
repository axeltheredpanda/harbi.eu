# CLAUDE.md — Contexte projet

## C'est quoi
Site perso combinant un portfolio public (destiné aux recruteurs) et une zone privée
(Claudette, Cutout, market watchlist, vehicle tracker). Projet solo, fait sur temps libre.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4
- Supabase : auth + DB (chat + `vehicles` + `bg_removals` + `site_settings`) + Storage
- API Anthropic serveur (`/api/claude`, `/api/claude/upload`)
- Cutout : FastAPI + `transparent-background` (InSPyReNet) dans `services/cutout`,
  déployé en Hugging Face Space (Docker, port 7860) ; appelé via `/api/remove-bg`
- Market quotes via `/api/market` (Yahoo chart, revalidate ~5 min)
- Analytics optionnel : Umami (`NEXT_PUBLIC_UMAMI_*`)
- Déploiement : Vercel (site) + HF Spaces (cutout)

## Structure
- `app/(public)/` — landing FR/EN, sections work / now / notes / skills / contact
- `app/notes/` — mini-blog markdown (`content/notes/*.md`)
- `app/(private)/chat/` — Claudette
- `app/(private)/cutout/` — remove background
- `app/(private)/market/` — watchlist actions US tech
- `app/(private)/garage/` — tracker recherche voiture (CRUD Supabase)
- `app/(private)/settings/` — réglages site (ex. relationship status)
- `app/(private)/command-palette.tsx` — Cmd/Ctrl+K
- `services/cutout/` — FastAPI + transparent-background (fast / base→quality)
- `content/now.ts` — lignes "now" éditables
- `frontend/i18n/landing.ts` — dictionnaires FR/EN
- `app/opengraph-image.tsx` (+ notes OG)

## État actuel
- [x] Auth + proxy (`/chat` `/cutout` `/market` `/garage` `/settings`)
- [x] Claudette (streaming, modèles, uploads, UX)
- [x] Cutout (HF Spaces + health/cache/retry + history) — SQL `cutout-and-settings.sql`
- [x] Settings (relationship status single/dating → bannière publique)
- [x] Landing personnalité + FR/EN + now + notes + GitHub subtle + OG + Umami hook
- [x] Market widget + garage tracker + command palette
- [ ] Brancher Supabase (SQL à jour) + `CUTOUT_SERVICE_URL` (.env.local / Vercel)
- [ ] Contenu projets / LinkedIn encore placeholders

## Notes
- Pas de todo/projects UI (retirés volontairement).
- Mettre à jour cette section à chaque session.
