# Dynamic CV timeline — design

Date: 2026-07-29  
Status: draft for review  
Scope: public horizontal CV section + Settings CRUD (FR/EN milestones with optional image)

## Goal

Replace the “static PDF only” CV presence on the public landing with a **scroll-driven horizontal timeline** of career milestones. Milestones are **editable from `/settings`** (add, edit, reorder, publish, optional logo), bilingual **FR + EN**, without redeploying.

The PDF download (`/resume.pdf`) remains as a secondary exit — the timeline is the primary experience.

## Non-goals (v1)

- Auto-generating a PDF from milestones
- Milestone types/tags (stage / job / école) — can add later
- Inline editing on the public page
- Drag-and-drop on mobile beyond simple ↑↓ reorder
- Public comments or “share this milestone”

## Public experience

### Placement

New landing section `#cv`, after Selected work (or before Now — exact order fixed at implementation; prefer **after work, before now** so the CV reads as biography following proof of craft).

Nav gains a **CV** link pointing to `#cv` (FR/EN copy in `frontend/i18n/landing.ts`).

Hero CTA “Lire le CV” / “Read the résumé” scrolls to `#cv` (smooth); a small text link inside the section still offers the PDF.

### Scroll behavior

1. User scrolls vertically into `#cv`.
2. Section **pins** (sticky / scroll-hijack pattern) for the duration of the horizontal journey.
3. Continued vertical scroll **maps to horizontal progress** across milestones (one panel ≈ one milestone).
4. After the last milestone, pin releases and normal page scroll resumes (Now, Notes, …).
5. `prefers-reduced-motion: reduce`: no hijack — milestones stack vertically in the same visual language.

Progress UI: a thin track + dots under the active panel (mono, editorial — not a SaaS stepper). Active milestone is clear; neighbors peek slightly on desktop.

### Milestone slide content

Per active locale (`fr` | `en` from existing landing locale switch):

| Element | Source | Notes |
|--------|--------|--------|
| Period | `period` | Shared, e.g. `2024—2025` |
| Title | `title_fr` / `title_en` | Display weight |
| Place | `place_fr` / `place_en` | Muted |
| Summary | `summary_fr` / `summary_en` | Max ~2 short sentences |
| Image | `image_path` → public URL | Optional; small mark/logo, not a hero card |

Empty published list: section hidden (or a one-line “CV bientôt” only if we want a placeholder — **prefer hide** until ≥1 published milestone).

### Motion

- Horizontal translate of the track driven by pin progress (CSS transform or anime.js — match existing `frontend/motion` patterns).
- Soft fade/settle on the active panel; avoid glow, pills, and dashboard chrome.
- Respect reduced motion as above.

## Data model

### Table `public.cv_milestones`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `period` | `text` not null | Display string, not a date range type |
| `title_fr` | `text` not null | |
| `title_en` | `text` not null | |
| `place_fr` | `text` not null default `''` | |
| `place_en` | `text` not null default `''` | |
| `summary_fr` | `text` not null | |
| `summary_en` | `text` not null | |
| `image_path` | `text` null | Storage object path |
| `sort_order` | `int` not null default `0` | Lower = earlier in journey (or higher = later — pick **ascending = left→right chronological**, document in SQL) |
| `published` | `boolean` not null default `false` | Public only sees `true` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

RLS:

- **Public select**: `published = true`
- **Authenticated insert/update/delete**: any logged-in user (solo site; same pattern as `site_settings`)

SQL file: `supabase/cv-milestones.sql` (idempotent, safe to re-run), referenced from `CLAUDE.md`.

### Storage bucket `cv-milestones`

- Public **read** (logos on landing without signed URLs)
- Authenticated **upload / update / delete** scoped to the bucket (solo; path can be `{milestone_id}/{filename}` or `uploads/{uuid}-{filename}`)
- Accept images only (jpeg/png/webp/svg); max size ~1–2 MB enforced in Server Action

## Backend

New module `backend/cv/milestones.ts`:

- `listPublishedMilestones()` — public landing, ordered by `sort_order` ascending (left → right)
- `listAllMilestones()` — settings (auth), same order
- `createMilestone` / `updateMilestone` / `deleteMilestone`
- `reorderMilestones(ids: string[])` — rewrite `sort_order` 0..n-1
- `uploadMilestoneImage(milestoneId, file)` / `clearMilestoneImage`

Server Actions only (no public write API). Revalidate `/` and `/settings` on mutate.

Types in `backend/supabase/types.ts`.

## Settings UI

On `/settings`, new section **CV timeline** (below relationship, above or beside Claudette):

- Ordered list of milestones (published badge, period, title FR as primary label)
- Actions: edit, delete, ↑↓ reorder, toggle published
- Create / edit form:
  - `period`
  - FR | EN columns for title, place, summary
  - Image upload + remove
  - Save
- Compact preview of one slide (optional but nice) using current form values

Widen settings layout slightly if needed for bilingual columns (`max-w-lg` → `max-w-2xl` for this page only).

## Landing wiring

- `app/(public)/page.tsx` fetches published milestones in parallel with notes / github / settings / fuel
- Pass into `LandingPage` as `milestones`
- New client section component e.g. `app/(public)/cv-timeline.tsx` (colocation) that owns pin + horizontal progress
- Locale switch already on landing: timeline re-reads FR/EN fields from the same props (no refetch)

## i18n

Landing copy additions: section title, short intro, PDF link label, empty/hidden behavior (no empty state if section omitted), nav label `navCv`.

Milestone body text lives in DB, not in `dictionaries`.

## Accessibility

- Section landmark + heading
- Progress dots as buttons that jump to a milestone (keyboard)
- During pin, ensure focus order follows active panel; do not trap focus forever
- Reduced motion path is first-class, not an afterthought
- Images: empty `alt` if decorative logo; otherwise alt = title or place

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Scroll-jacking feels hostile | Short journey (few milestones), clear progress, easy escape past section; reduced-motion bypass |
| CLS / layout jump on pin | Reserve min-height for `#cv`; pin only after section top hits viewport |
| Image abuse / large files | Type + size checks server-side |
| Unpublished drafts leaked | RLS `published = true` for anon; never select drafts on public page |

## Success criteria

1. ≥1 published milestone → `#cv` shows horizontal (or stacked if reduced motion) journey driven by scroll.
2. Owner can CRUD + reorder + upload logo from Settings; landing updates after save (revalidate).
3. FR/EN switch on landing swaps milestone copy without reload.
4. PDF link still works; no regression on banner / work / now sections.

## Implementation order (preview)

1. SQL + types + backend CRUD  
2. Settings UI + image upload  
3. Landing section shell (static horizontal track)  
4. Pin + scroll mapping + motion + a11y  
5. Nav / CTA wiring + `CLAUDE.md` update  

Detailed plan to follow after this spec is approved.
