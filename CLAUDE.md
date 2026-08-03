# CLAUDE.md - Contexte projet

## C'est quoi
Site perso combinant un portfolio public (destiné aux recruteurs) et une zone privée
(Claudette, Jarvis/Today, Cutout, Convert, news, analytics, settings). Projet solo, fait sur temps libre.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4
- Supabase : auth + DB (chat + `bg_removals` + `site_settings` + `cv_milestones` + news) + Storage
- API Anthropic serveur (`/api/claude`, `/api/claude/upload`)
- Cutout : `@imgly/background-removal` **dans le navigateur** (ONNX) + stockage /
  cache hash via `/api/remove-bg` - pas de microservice Python
- Convert : formats image entièrement client-side (Canvas + `@jsquash/avif` + `heic-to`)
  - historique localStorage, zip via JSZip
- News : drawer RSS reader (`frontend/news/*`) - feeds/feed_items in Supabase,
  sync serveur toutes les 30 min (GitHub Actions) + Refresh manuel (connecté),
  raccourcis Windows (Ctrl+K palette, Ctrl+Shift+Y news, j/k/Enter/m/r)
- Prix E10 national via Mon Plein Pas Cher (`backend/fuel.ts`, banner publique)
- Rapport privé `/analytics` (`claude_usage`, `service_events` - SQL `supabase/analytics.sql`)
- Jarvis second-brain `/today` - notes RAG (Voyage + pgvector), briefing quotidien Haiku - SQL `supabase/jarvis.sql`
- CV timeline publique (scroll horizontal pin) + CRUD Settings - SQL `supabase/cv-milestones.sql`
- Déploiement : Vercel (+ Analytics + Speed Insights)

## Structure
- `app/(public)/` - landing (EN), sections work / now / notes / skills / contact
- `app/(public)/specimen-card.tsx` - cartes « museum specimen » pour Selected work
- `app/notes/` - mini-blog markdown (`content/notes/*.md`)
- `app/(private)/today/` - Jarvis home (briefing, ask/search, notes)
- `app/(private)/chat/` - Claudette
- `backend/jarvis/` - notes, Voyage embeds, Haiku process, RAG, briefing
- `app/(private)/cutout/` - remove background (client ONNX)
- `app/(private)/convert/` - image format converter (Canvas + WASM, fully client-side)
- `app/(private)/analytics/` - rapport d’usage / santé du site
- `app/(private)/settings/` - onglets Site / CV / Claudette / Memory
- Claudette UX: branching, memories, canvas, voice, context gauge — SQL `supabase/claudette-ux.sql`
- `app/(private)/command-palette.tsx` - Ctrl+K
- `app/(public)/cv-timeline.tsx` - frise sticky (ligne terracotta) ; stack mobile / reduced-motion
- `backend/cv/milestones.ts` - drafts autosave + publish explicite (EN, FR colonnes mirroir)
- `frontend/cv/milestone-image.ts` - URL logos bucket
- `frontend/cutout/remove-background.ts` - wrapper imgly
- `frontend/convert/` - decode / encode / zip / local history
- `backend/analytics/` - agrégation + pricing approx
- `frontend/navigation/soft-nav-refresh.tsx` - revisit → show router cache, refresh RSC
- `content/now.ts` - lignes "now" éditables (EN)
- `content/now-playing.ts` - fallback titre / artiste / url (override Settings)
- `frontend/i18n/landing.ts` - copy EN only
- `app/opengraph-image.tsx` (+ notes OG)

## État actuel
- [x] Auth + proxy (`/today` `/chat` `/cutout` `/convert` `/analytics` `/settings`)
- [x] Jarvis foundation (`/today`) - notes, wiki links, hybrid search, RAG ask, daily briefing
- [x] Claudette (streaming, modèles, uploads, UX, web search per-message, draft landing, coût, copy-segments)
- [x] Claudette UX: memory system, branching, canvas, quick actions, voice, context gauge, micro-interactions — SQL `claudette-ux.sql`
- [x] Cutout in-browser (imgly) + history/cache Supabase - SQL `cutout-and-settings.sql`
- [x] Convert in-browser (HEIC/TIFF/… → PNG/JPG/WebP/AVIF/BMP) + zip + local history
- [x] Settings (relationship status single/dating → bannière publique)
- [x] Landing personnalité + now + notes + GitHub subtle + OG (English only)
- [x] Command palette (Ctrl+K)
- [x] Selected work en cartes museum specimen (Axel CRM Nº 01 ; crédit studio Axel Project)
- [x] News drawer RSS + sync GitHub Actions
- [x] Rapport `/analytics` (tokens, coût, cutout, news, patterns) - SQL `analytics.sql`
- [x] Vercel Analytics + Speed Insights
- [x] Banner E10 nationale (Mon Plein Pas Cher - moyenne, tendance 1j, min-max)
- [x] CV timeline (`#cv` sticky track + Settings onglet CV deux panneaux) - SQL `cv-milestones.sql`
- [x] Mode blague Louis (toggle Settings, quiz login, bloc Claudette) - SQL `louis-joke-mode.sql`
- [x] Claudette : draft chat au landing, coût turn discret, copy-segments Haiku (hover discret sur extraits)
- [x] Market + garage retirés de l’UI (nav / routes / API) - tables DB éventuellement encore présentes
- [x] Soft-nav SWR : `experimental.staleTimes` 30 min + `SoftNavRefresh` (cache immédiat, maj en fond)
- [x] Landing : badge tech footer + now-playing sous la meta bar (desktop only) - SQL `now-playing.sql`
- [x] Site EN only (plus de toggle FR/EN ; CV settings anglais, colonnes FR mirroir)
- [ ] Brancher Supabase (SQL à jour) si besoin - dont `supabase/now-playing.sql`
- [ ] Contenu projets encore placeholders
- [x] Contact : arthur.reichard@essec.edu · GitHub · LinkedIn
- [x] SEO : sitemap.xml, robots.txt, metadata Arthur Reichard, JSON-LD Person
- [ ] Soumettre harbi.eu dans Google Search Console (sitemap `/sitemap.xml`)
## Notes
- Pas de todo/projects / market / garage UI (retirés volontairement).
- Mettre à jour cette section à chaque session.
