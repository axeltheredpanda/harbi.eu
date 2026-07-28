# CLAUDE.md — Contexte projet

## C'est quoi
Site perso combinant un portfolio public (destiné aux recruteurs) et une zone privée
(todo, projets, Claudette — wrapper Claude persistant). Projet solo, fait sur temps libre.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind 4
- Supabase : auth (email/password ou magic link) + DB (tables `todos`, `projects`,
  `conversations`, `messages`, `attachments`) + Storage bucket `chat-attachments`
- API Anthropic appelée uniquement côté serveur via route handlers (`/api/claude`,
  `/api/claude/upload`), clé jamais exposée au client
- Déploiement : Vercel

## Structure des dossiers
`app/` ne contient que du routing (pages, layouts, route handlers) et les petits
composants client directement liés à une route (colocation, convention Next.js standard).
Toute la logique (accès Supabase, appel Anthropic, types) vit dans `backend/` ou `frontend/`.

- `app/(public)/` — portfolio, présentation, CV interactif, projets mis en avant
  (Axel Project, Astraia)
- `app/(private)/` — zone connectée : todo, projets perso, Claudette
  (layout fait le gate d'auth ; nav : `nav-links.tsx`, `sign-out-button.tsx`)
- `app/(private)/chat/` — chat multi-conversations Claudette (sidebar, streaming,
  markdown, pièces jointes) ; redirects `/claude` et `/claudette` → `/chat`
- `app/api/claude/` — SSE streaming Anthropic + upload PDF/image
- `app/login/`, `app/auth/callback/` — pages/routes d'auth publiques
- `backend/` — code serveur uniquement (jamais importé par un composant client) :
  - `backend/supabase/server.ts` — client Supabase pour Server Components / Server Actions
  - `backend/supabase/proxy.ts` — logique de rafraîchissement de session utilisée par `proxy.ts`
  - `backend/supabase/types.ts` — types Database
  - `backend/todos.ts`, `backend/projects.ts` — Server Actions
  - `backend/chat/` — conversations, context window + résumé, PDF extract, constantes modèles
  - `backend/anthropic.ts` — client Anthropic (clé serveur uniquement)
- `frontend/supabase/client.ts` — client Supabase navigateur
- `proxy.ts` — (ex `middleware.ts`) rafraîchit la session Supabase et protège
  `/todo`, `/projects`, `/chat` ; redirect `/claude` et `/claudette` → `/chat`

## Conventions
- Composants en TypeScript strict, un composant = un fichier
- Nommage : kebab-case pour les fichiers, PascalCase pour les composants
- Commits : format court impératif (`add todo page`, `fix auth redirect`), pas de gros
  commits fourre-tout
- Variables d'env dans `.env.local`, jamais commitées, `.env.example` tenu à jour
- Pas de logique métier dans les composants UI — passe par `backend/` (serveur) ou
  `frontend/` (client)

## État actuel
- [x] Setup initial (Next.js + Supabase + Tailwind)
- [x] Auth + proxy (email/password + magic link, `/todo` `/projects` `/chat` protégés)
- [x] Claudette : chat UI editorial à `/chat` — optimistic send, thinking phrases,
  streaming markdown + caret, sticky scroll + jump button, edit/regenerate, sidebar
  search + mobile drawer, empty/error+retry, titres IA (Haiku après 1er échange),
  upload PDF/image (`/api/claude`, `/api/claude/upload`)
- [x] Todo list (CRUD via Supabase, RLS par `user_id`)
- [x] Section projets (CRUD via Supabase, RLS par `user_id`)
- [x] Portfolio public — landing editorial + détails de personnalité (bio,
      compteur café, thème rally caché, skill joke au hover, 404 motorsport,
      intros projets, lien Login)
- [ ] Design final hors Claudette / landing (skill frontend-design)

Reste à faire avant usage réel :
- Créer un projet Supabase, remplir `.env` depuis `.env.example`, exécuter `supabase/schema.sql`
  (inclut tables chat + bucket `chat-attachments`)
- Créer au moins un utilisateur (auth Supabase) pour accéder à `/todo` `/projects` `/chat`
- Remplacer les TODO de contenu dans `app/(public)/page.tsx`

## Notes
- Mettre à jour la section "État actuel" à chaque session plutôt que de laisser Claude
  Code redécouvrir l'avancement à chaque fois.
- Ne pas sur-documenter les specs fonctionnelles tant que rien n'est codé — ce fichier
  sert de mémoire technique, pas de cahier des charges.
