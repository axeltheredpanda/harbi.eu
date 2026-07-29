# CLAUDE.md — Contexte projet

## C'est quoi
Site perso combinant un portfolio public (destiné aux recruteurs) et une zone privée
(Claudette, Cutout, market watchlist, vehicle tracker). Projet solo, fait sur temps libre.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4
- Supabase : auth + DB (chat + `vehicles` + `bg_removals` + `site_settings`) + Storage
- API Anthropic serveur (`/api/claude`, `/api/claude/upload`)
- Cutout : `@imgly/background-removal` **dans le navigateur** (ONNX) + stockage /
  cache hash via `/api/remove-bg` — pas de microservice Python
- News : RSS curated (`content/news-feeds.ts`) → `/api/news/sync` → `news_items` ;
  sync gratuit toutes les 3h via GitHub Actions + bouton « Sync now » si connecté
- Market quotes via `/api/market` (Yahoo chart, revalidate ~5 min)
- Analytics optionnel : Umami (`NEXT_PUBLIC_UMAMI_*`)
- Déploiement : Vercel

## Structure
- `app/(public)/` — landing FR/EN, sections work / now / notes / skills / contact
- `app/notes/` — mini-blog markdown (`content/notes/*.md`)
- `app/(private)/chat/` — Claudette
- `app/(private)/cutout/` — remove background (client ONNX)
- `app/(private)/market/` — watchlist actions US tech
- `app/(private)/garage/` — tracker recherche voiture (CRUD Supabase)
- `app/(private)/settings/` — réglages site (ex. relationship status)
- `app/(private)/command-palette.tsx` — Cmd/Ctrl+K
- `frontend/cutout/remove-background.ts` — wrapper imgly
- `content/now.ts` — lignes "now" éditables
- `frontend/i18n/landing.ts` — dictionnaires FR/EN
- `app/opengraph-image.tsx` (+ notes OG)

## État actuel
- [x] Auth + proxy (`/chat` `/cutout` `/market` `/garage` `/settings`)
- [x] Claudette (streaming, modèles, uploads, UX)
- [x] Cutout in-browser (imgly) + history/cache Supabase — SQL `cutout-and-settings.sql`
- [x] Settings (relationship status single/dating → bannière publique)
- [x] Landing personnalité + FR/EN + now + notes + GitHub subtle + OG + Umami hook
- [x] Market widget + garage tracker + command palette
- [ ] Brancher Supabase (SQL à jour) + env Umami si besoin
- [ ] Contenu projets / LinkedIn encore placeholders

## Notes
- Pas de todo/projects UI (retirés volontairement).
- Mettre à jour cette section à chaque session.
