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
- News : drawer RSS reader (`frontend/news/*`) — feeds/feed_items in Supabase,
  sync serveur toutes les 30 min (GitHub Actions) + Refresh manuel (connecté),
  raccourcis Windows (Ctrl+K palette, Ctrl+Shift+Y news, j/k/Enter/m/r)
- Market quotes via `/api/market` (Yahoo chart, revalidate ~5 min)
- Rapport privé `/analytics` (`claude_usage`, `service_events` — SQL `supabase/analytics.sql`)
- Déploiement : Vercel (+ Speed Insights)

## Structure
- `app/(public)/` — landing FR/EN, sections work / now / notes / skills / contact
- `app/(public)/specimen-card.tsx` — cartes « museum specimen » pour Selected work
- `app/notes/` — mini-blog markdown (`content/notes/*.md`)
- `app/(private)/chat/` — Claudette
- `app/(private)/cutout/` — remove background (client ONNX)
- `app/(private)/market/` — watchlist actions US tech
- `app/(private)/garage/` — tracker recherche voiture (CRUD Supabase)
- `app/(private)/analytics/` — rapport d’usage / santé du site
- `app/(private)/settings/` — réglages site (ex. relationship status)
- `app/(private)/command-palette.tsx` — Ctrl+K
- `frontend/cutout/remove-background.ts` — wrapper imgly
- `backend/analytics/` — agrégation + pricing approx
- `content/now.ts` — lignes "now" éditables
- `frontend/i18n/landing.ts` — dictionnaires FR/EN
- `app/opengraph-image.tsx` (+ notes OG)

## État actuel
- [x] Auth + proxy (`/chat` `/cutout` `/market` `/garage` `/analytics` `/settings`)
- [x] Claudette (streaming, modèles, uploads, UX, web search per-message)
- [x] Cutout in-browser (imgly) + history/cache Supabase — SQL `cutout-and-settings.sql`
- [x] Settings (relationship status single/dating → bannière publique)
- [x] Landing personnalité + FR/EN + now + notes + GitHub subtle + OG
- [x] Market widget + garage tracker + command palette
- [x] Selected work en cartes museum specimen (Axel CRM Nº 01 ; crédit studio Axel Project)
- [x] News drawer RSS + sync GitHub Actions
- [x] Rapport `/analytics` (tokens, coût, cutout, news, patterns) — SQL `analytics.sql`
- [x] Vercel Speed Insights
- [ ] Brancher Supabase (SQL à jour) si besoin
- [ ] Contenu projets / LinkedIn encore placeholders
## Notes
- Pas de todo/projects UI (retirés volontairement).
- Mettre à jour cette section à chaque session.
