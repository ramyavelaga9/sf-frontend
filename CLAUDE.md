# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Frontend for the Contacts API (`sf-backend`): browse, search, sort, page, create, edit,
and delete contacts. Next.js 16 (App Router) · TypeScript · Tailwind CSS · Zod ·
Jest + Testing Library + MSW · Playwright.

## Commands

```bash
npm install
npx playwright install              # once, for e2e browsers
cp .env.local.example .env.local    # then set API_BASE_URL (default http://127.0.0.1:8000)
npm run dev                         # http://localhost:3000 -> /contacts
```

The Contacts API backend must be running, or the app degrades gracefully (list page
says "unreachable" instead of crashing).

| Command | Purpose |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Jest |
| `npx jest path/to/file.test.tsx -t "test name"` | Single test |
| `npm run test:e2e` | Playwright (starts its own dev server) |
| `npm run test:e2e -- --workers=2` | Use when e2e's default 8 parallel workers wedges a single-worker in-memory-SQLite backend |
| `npm run test:e2e:ui` / `npm run test:e2e:report` | Playwright UI mode / last HTML report |

`@/*` maps to `src/*` in both TypeScript and Jest.

## Architecture

**Server-side only API access — this is the load-bearing design decision.** Reads
happen in server components, writes in server actions (`src/app/contacts/actions.ts`).
`API_BASE_URL` (server-only env var) never reaches the browser, so there is no CORS
surface and no client-side loading waterfall on first paint. This requires a Node
runtime — `output: "export"` (static export) is not supported. `src/lib/apiClient.ts`
is the fetch wrapper (base URL, `ApiError`, `ApiUnreachableError`); `src/lib/contacts/api.ts`
is the *only* module that knows the backend's endpoint shapes, mirroring its
`/openapi.json` 1:1.

**Errors are typed, not swallowed**: backend `404` → `null` (renders the app's 404
page), `409` → a field-level error on the email input, `422` → unpacked from FastAPI's
`HTTPValidationError` into per-field messages, unreachable backend →
`ApiUnreachableError` with a panel naming the URL it tried. Preserve this mapping when
touching `src/lib/contacts/api.ts` or the actions that call it.

**List state lives entirely in the URL** (`?q=&sort=&order=&page=&perPage=`), parsed
and sanitized by `src/lib/contacts/query.ts`. Sort values are validated against the
same allow-list the backend uses, so a hand-edited URL can never trigger a `422`.

**Forms have one source of truth**: `CONTACT_FIELD_GROUPS` in `src/lib/contacts/schema.ts`
drives both the rendered fields and the Zod validation rules, which mirror the API's
own length/required constraints. Submission is a real form `action` (works pre-hydration);
`useActionState` surfaces the result. Add/change a contact field here, not by hand-rolling
inputs in the form components.

**Route-group Suspense boundary is intentional, don't "simplify" it**: the list's
`loading.tsx` lives under `src/app/contacts/(list)/`, not directly under
`src/app/contacts/`. Placing it one level up would also wrap `[id]`, flushing the page
shell early and turning that route's `notFound()` into a `200` instead of a `404`.

**Styling**: Tailwind against semantic CSS variables (`bg-background`,
`text-muted-foreground`, `border-hairline`, …) defined in `src/app/globals.css`. Dark is
the default; light lives under `[data-theme="light"]`. Add new colors as tokens there
plus a `tailwind.config.ts` entry — don't hard-code hex values in components. Fonts
(Inter / Space Grotesk / JetBrains Mono) are self-hosted under `src/app/fonts/` via
`next/font/local` so builds never fetch Google Fonts.

**Version stamp**: `next.config.ts` injects `NEXT_PUBLIC_APP_VERSION`,
`NEXT_PUBLIC_BUILD_NUMBER` (CI `BUILD_NUMBER`, else git commit count), and
`NEXT_PUBLIC_GIT_SHA`, rendered by `VersionFooter` on every page.

**Tests**: HTTP is stubbed with MSW (`src/__tests__/mocks/`) — never mock `fetch`
directly. Query by role/label, not test IDs. Jest config has three deliberate,
non-obvious pieces — don't remove them while debugging a failure:
- `jest-fixed-jsdom` environment — keeps Node's `fetch`/`Request`/stream globals that
  plain jsdom strips.
- `transformIgnorePatterns` override — MSW's dependency tree is ESM-only.
- a `FormData` shim — undici's `FormData` can't be built from a `<form>`, which is what
  React 19 does on submit.

`e2e/` runs against a **real** backend (not MSW); each spec creates its own contact
with a unique email and deletes it again.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
