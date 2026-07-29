# Dynamic CV Timeline Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a scroll-pinned horizontal CV section on the public landing, fed by bilingual milestones CRUD in Settings (optional logo).

**Architecture:** Supabase table `cv_milestones` + public Storage bucket; Server Actions in `backend/cv/milestones.ts`; Settings editor; landing `CvTimeline` client section that maps vertical scroll progress to horizontal translate (reduced-motion stacks vertically).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4, Supabase (Postgres + Storage), existing landing locale + motion helpers.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-29-cv-timeline-design.md`
- No PDF auto-generation; keep `/resume.pdf` link
- Public only sees `published = true`
- Ascending `sort_order` = left → right chronological
- Section `#cv` after Selected work, before Now; hide section if zero published milestones
- Commits: short imperative messages

## File map

| Path | Role |
|------|------|
| `supabase/cv-milestones.sql` | Table, RLS, bucket, policies |
| `backend/supabase/types.ts` | `cv_milestones` types |
| `backend/cv/milestones.ts` | List/CRUD/reorder/image Server Actions |
| `app/(private)/settings/cv-milestones-section.tsx` | Settings UI |
| `app/(private)/settings/page.tsx` | Wire section + widen layout |
| `app/(public)/cv-timeline.tsx` | Public pin + horizontal track |
| `app/(public)/landing-page.tsx` | Insert section, nav, CTA |
| `app/(public)/page.tsx` | Fetch published milestones |
| `frontend/i18n/landing.ts` | `navCv`, `cvTitle`, `cvIntro`, `cvPdf` |
| `CLAUDE.md` | État + SQL note |

---

### Task 1: SQL + types

**Files:**
- Create: `supabase/cv-milestones.sql`
- Modify: `backend/supabase/types.ts`

- [ ] **Step 1:** Add idempotent SQL (table, indexes, RLS, bucket `cv-milestones`, storage policies). Document `sort_order` ascending = chronological left→right.
- [ ] **Step 2:** Add `cv_milestones` to `Database["public"]["Tables"]`.
- [ ] **Step 3:** Commit `add cv_milestones schema and types`

---

### Task 2: Backend Server Actions

**Files:**
- Create: `backend/cv/milestones.ts`

**Produces:**
- `CvMilestone` row type
- `CvMilestoneInput` for create/update fields
- `milestoneImageUrl(path: string | null): string | null`
- `listPublishedMilestones()`, `listAllMilestones()`
- `createMilestone`, `updateMilestone`, `deleteMilestone`
- `reorderMilestones(ids: string[])`, `setMilestonePublished(id, published)`
- `uploadMilestoneImage(id, formData)`, `clearMilestoneImage(id)`

- [ ] **Step 1:** Implement module with auth checks, trim validation, image type/size caps (jpeg/png/webp/svg, 2MB), revalidate `/` and `/settings`.
- [ ] **Step 2:** Commit `add cv milestones server actions`

---

### Task 3: Settings UI

**Files:**
- Create: `app/(private)/settings/cv-milestones-section.tsx`
- Modify: `app/(private)/settings/page.tsx`

- [ ] **Step 1:** Client section: list with ↑↓, publish toggle, edit/delete; form with period + FR/EN fields + image upload/remove; compact preview.
- [ ] **Step 2:** Page loads `listAllMilestones()`, widens to `max-w-2xl`, renders section below relationship form.
- [ ] **Step 3:** Commit `add CV timeline settings editor`

---

### Task 4: Landing timeline + i18n

**Files:**
- Create: `app/(public)/cv-timeline.tsx`
- Modify: `app/(public)/landing-page.tsx`, `app/(public)/page.tsx`, `frontend/i18n/landing.ts`, `CLAUDE.md`

- [ ] **Step 1:** i18n keys `navCv`, `cvTitle`, `cvIntro`, `cvPdf`.
- [ ] **Step 2:** `CvTimeline` — pin spacer height ≈ `milestones.length * 100vh` (or fixed per panel), sticky viewport, horizontal track `translateX` from scroll progress; dots as jump buttons; reduced motion = vertical stack.
- [ ] **Step 3:** Wire fetch + section between work and now; nav + hero CTA → `#cv`.
- [ ] **Step 4:** Update `CLAUDE.md`; `tsc --noEmit`; commit & push.

---

## Verification

1. Run `supabase/cv-milestones.sql` in Supabase (manual — agent cannot).
2. `/settings`: create 2–3 milestones, upload logo, publish, reorder.
3. `/`: `#cv` appears; scroll pins and advances panels; FR/EN switch swaps copy; reduced motion stacks.
4. Unpublish all → section hidden.
5. PDF link still downloads.
