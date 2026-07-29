# CLAUDE.md — Contexte projet

## C'est quoi
Site perso combinant un portfolio public (destiné aux recruteurs) et une zone privée
(Claudette, Cutout, news, analytics, settings). Projet solo, fait sur temps libre.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4
- Supabase : auth + DB (chat + `bg_removals` + `site_settings` + `cv_milestones` + news) + Storage
- API Anthropic serveur (`/api/claude`, `/api/claude/upload`)
- Cutout : `@imgly/background-removal` **dans le navigateur** (ONNX) + stockage /
  cache hash via `/api/remove-bg` — pas de microservice Python
- News : drawer RSS reader (`frontend/news/*`) — feeds/feed_items in Supabase,
  sync serveur toutes les 30 min (GitHub Actions) + Refresh manuel (connecté),
  raccourcis Windows (Ctrl+K palette, Ctrl+Shift+Y news, j/k/Enter/m/r)
- Prix E10 national via Mon Plein Pas Cher (`backend/fuel.ts`, banner publique)
- Rapport privé `/analytics` (`claude_usage`, `service_events` — SQL `supabase/analytics.sql`)
- CV timeline publique (scroll horizontal pin) + CRUD Settings — SQL `supabase/cv-milestones.sql`
- Déploiement : Vercel (+ Analytics + Speed Insights)

## Structure
- `app/(public)/` — landing FR/EN, sections work / now / notes / skills / contact
- `app/(public)/specimen-card.tsx` — cartes « museum specimen » pour Selected work
- `app/notes/` — mini-blog markdown (`content/notes/*.md`)
- `app/(private)/chat/` — Claudette
- `app/(private)/cutout/` — remove background (client ONNX)
- `app/(private)/analytics/` — rapport d’usage / santé du site
- `app/(private)/settings/` — onglets Site / CV / Claudette
- `app/(private)/command-palette.tsx` — Ctrl+K
- `app/(public)/cv-timeline.tsx` — frise sticky (ligne terracotta) ; stack mobile / reduced-motion
- `backend/cv/milestones.ts` — drafts autosave + publish explicite
- `frontend/cv/milestone-image.ts` — URL logos bucket
- `frontend/cutout/remove-background.ts` — wrapper imgly
- `backend/analytics/` — agrégation + pricing approx
- `frontend/navigation/soft-nav-refresh.tsx` — revisit → show router cache, refresh RSC
- `content/now.ts` — lignes "now" éditables
- `content/now-playing.ts` — fallback titre / artiste / url (override Settings)
- `frontend/i18n/landing.ts` — dictionnaires FR/EN
- `app/opengraph-image.tsx` (+ notes OG)

## État actuel
- [x] Auth + proxy (`/chat` `/cutout` `/analytics` `/settings`)
- [x] Claudette (streaming, modèles, uploads, UX, web search per-message, draft landing, coût, copy-segments)
- [x] Cutout in-browser (imgly) + history/cache Supabase — SQL `cutout-and-settings.sql`
- [x] Settings (relationship status single/dating → bannière publique)
- [x] Landing personnalité + FR/EN + now + notes + GitHub subtle + OG
- [x] Command palette (Ctrl+K)
- [x] Selected work en cartes museum specimen (Axel CRM Nº 01 ; crédit studio Axel Project)
- [x] News drawer RSS + sync GitHub Actions
- [x] Rapport `/analytics` (tokens, coût, cutout, news, patterns) — SQL `analytics.sql`
- [x] Vercel Analytics + Speed Insights
- [x] Banner E10 nationale (Mon Plein Pas Cher — moyenne, tendance 1j, min–max)
- [x] CV timeline (`#cv` sticky track + Settings onglet CV deux panneaux) — SQL `cv-milestones.sql`
- [x] Mode blague Louis (toggle Settings, quiz login, bloc Claudette) — SQL `louis-joke-mode.sql`
- [x] Claudette : draft chat au landing, coût turn discret, copy-segments Haiku (hover discret sur extraits)
- [x] Market + garage retirés de l’UI (nav / routes / API) — tables DB éventuellement encore présentes
- [x] Soft-nav SWR : `experimental.staleTimes` 30 min + `SoftNavRefresh` (cache immédiat, maj en fond)
- [x] Landing : badge tech footer + now-playing sous la meta bar (desktop only) — SQL `now-playing.sql`
- [ ] Brancher Supabase (SQL à jour) si besoin — dont `supabase/now-playing.sql`
- [ ] Contenu projets encore placeholders
- [x] Contact : arthur.reichard@essec.edu · GitHub · LinkedIn
## Notes
- Pas de todo/projects / market / garage UI (retirés volontairement).
- Mettre à jour cette section à chaque session.
