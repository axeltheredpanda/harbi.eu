# CLAUDE.md — Contexte projet

## C'est quoi
Site perso combinant un portfolio public (destiné aux recruteurs) et une zone privée
(Claudette, Cutout/rembg, market watchlist, vehicle tracker). Projet solo, fait sur temps libre.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4
- Supabase : auth + DB (chat + `vehicles` + `bg_removals`) + Storage `chat-attachments` / `bg-removals`
- API Anthropic serveur (`/api/claude`, `/api/claude/upload`)
- rembg microservice Python (`services/rembg`) appelé via `/api/remove-bg`
- Market quotes via `/api/market` (Yahoo chart, revalidate ~5 min)
- Analytics optionnel : Umami (`NEXT_PUBLIC_UMAMI_*`)
- Déploiement : Vercel (+ Railway/Render pour rembg)

## Structure
- `app/(public)/` — landing FR/EN, sections work / now / notes / skills / contact
- `app/notes/` — mini-blog markdown (`content/notes/*.md`)
- `app/(private)/chat/` — Claudette
- `app/(private)/cutout/` — remove background (rembg)
- `app/(private)/market/` — watchlist actions US tech
- `app/(private)/garage/` — tracker recherche voiture (CRUD Supabase)
- `app/(private)/command-palette.tsx` — Cmd/Ctrl+K
- `services/rembg/` — FastAPI + rembg (fast=u2net, quality=birefnet-general)
- `content/now.ts` — lignes "now" éditables
- `frontend/i18n/landing.ts` — dictionnaires FR/EN
- `app/opengraph-image.tsx` (+ notes OG)

## État actuel
- [x] Auth + proxy (`/chat` `/cutout` `/market` `/garage`)
- [x] Claudette (streaming, modèles, uploads, UX)
- [x] Cutout (rembg microservice + before/after + history) — déployer `services/rembg` + SQL `bg_removals` / bucket
- [x] Landing personnalité + FR/EN + now + notes + GitHub subtle + OG + Umami hook
- [x] Market widget + garage tracker + command palette
- [ ] Brancher Supabase (schema à jour avec `vehicles` + `bg_removals`) + env Umami / REMBG_*
- [ ] Contenu projets / LinkedIn encore placeholders

## Notes
- Pas de todo/projects UI (retirés volontairement).
- Mettre à jour cette section à chaque session.
