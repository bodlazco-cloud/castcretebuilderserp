# CastCrete Builders ERP — Claude Code Guide

## Repository
- **GitHub**: `bodlazco-cloud/castcretebuilderserp`
- **Deployment**: Replit (tracks `main` branch)
- **Replit deploy command**: `git fetch origin main && git reset --hard origin/main` then republish

## Working branch
Always develop on **`claude/deploy-castcrete-erp-on19o`**.

1. Make changes and commit to this branch
2. Push: `git push -u origin claude/deploy-castcrete-erp-on19o`
3. Open a PR targeting `main` (use `mcp__github__create_pull_request`)
4. User merges the PR on GitHub, then pulls and republishes on Replit

**Never push directly to `main`.**

## Critical: squash-merge gotcha
Replit squash-merges every PR. This creates a new commit hash on `main` that diverges from the branch history, causing merge conflicts on the next PR. The fix before opening every new PR:

```bash
git fetch origin main
git merge origin/main -m "Merge origin/main into branch"
# If conflicts on files we own → git checkout --ours <file> && git add <file>
git push -u origin claude/deploy-castcrete-erp-on19o
```

Always run this before creating a PR if the branch has been behind `main`.

## Tech stack
- Next.js 15 App Router, React Server Components (`force-dynamic` pages)
- Drizzle ORM + Supabase (Postgres)
- `"use client"` components use `useState`, `useTransition`, `useRouter`
- Server actions in `src/actions/` with `"use server"`, Zod validation, `revalidatePath`
- Auth: `getAuthUser()`, `isAdminOrBod()` from `@/lib/supabase-server`
- Dept guard: `guardDept(dept, ["PLANNING","ADMIN","BOD"])` in `src/actions/planning.ts`

## Key rules
- Server Components (`page.tsx` without `"use client"`) **cannot** have `onClick` or any event handlers — use `"use client"` wrapper components instead
- Collapsible UI uses native `<details>/<summary>` (server-rendered, no JS needed)
- All inline styles (no Tailwind/CSS modules)
- TypeScript `node_modules` are not installed in this sandbox — `tsc --noEmit` will show false positives for missing `react`, `next/navigation`, `drizzle-orm` etc. Filter those out; only fix real logic/type errors

## Completed sections (DO NOT MODIFY without user approval)

### Master List — fully complete as of PR #66 (`628360c`)
- **Projects/Sites** (`/master-list/projects/[id]`):
  - Collapsible Blocks & Units grouped by unit model (`<details>`)
  - Sections in order: BOQ → Material BOM → Labor BOM
  - Material BOM: collapsible tree (Model → Unit Type → Category → Scope → Materials)
  - BOQ: Developer Rate Cards (`DevRateCards` component, title="Bill of Quantities (BOQ)")
  - Labor BOM: Subcontractor Rate Cards (`SubconRateCards` component, title="Labor BOM")
- **Developers** (`/master-list/developers/[id]`): Rate Cards with optional `title` prop
- **Subcontractors** (`/master-list/subcontractors/[id]`): Rate Cards with optional `title` prop
- **SOW** (`/master-list/sow`): Read-only overview (Material BOM + Labor BOM per project)

### Planning — BOM Register — fully complete as of PR #66
- `/planning/bom`: Master BOM Register
  - Collapsible tree: Site → Model Type → Unit Type → Scope of Work → Materials
  - Add material lines inline (+ Add Material button per scope group)
  - Delete DRAFT/REJECTED lines inline (Delete button with confirm)
  - Edit full BOM entry (scope, activity, model, type, material, qty, equipment type)
  - Approval workflow: DRAFT → PENDING_REVIEW → APPROVED/REJECTED
  - Withdraw submission (PENDING_REVIEW → DRAFT)
  - BOD Approve/Reject individual lines

## BOM approval workflow
```
DRAFT → (submit) → PENDING_REVIEW → (BOD approve) → APPROVED
                                  → (BOD reject)  → REJECTED
PENDING_REVIEW → (withdraw) → DRAFT
REJECTED → (edit) → DRAFT → (submit) → PENDING_REVIEW
```
- Planning/Admin/BOD can create, edit (DRAFT or REJECTED only), add, delete, submit, withdraw
- Admin/BOD can approve or reject

## Database schema notes
- `masterBomEntries`: `status` enum `DRAFT | PENDING_REVIEW | APPROVED | REJECTED`
- `phaseCategories.sequenceOrder`, `phaseScopes.sequenceOrder`, `phaseActivities.sequenceOrder` all exist
- `materials.adminPrice`: `numeric`, notNull (returns as `string` from Drizzle)
- `materials.isActive`: boolean

## DB/schema import paths
```ts
import { masterBomEntries, materials, projects, ... } from "@/db/schema";
import { phaseCategories, phaseScopes, phaseActivities } from "@/db/schema/phases";
```
