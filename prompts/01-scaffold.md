# 01. Scaffold the project

**Goal:** a clean Next.js + TypeScript project with the agreed folder structure, UI kit and tooling.

## Prompt

```
Read docs/CONTEXT.md and README.md (sections 2, 3 and 4).

Set up the Next.js project in THIS folder without deleting docs/, prompts/, supabase/, README.md or .env.example.
(If create-next-app refuses because the folder is not empty, scaffold in a temporary sibling folder and move the files in.)

Do the following:
1. Next.js (latest stable) with App Router, TypeScript strict, Tailwind, ESLint, `src/` directory, pnpm.
2. Install: @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers
   firebase firebase-admin razorpay lucide-react sonner date-fns server-only clsx tailwind-merge.
3. Initialise shadcn/ui and add: button input label textarea select checkbox switch card badge dialog
   alert-dialog dropdown-menu sheet table tabs form skeleton progress separator avatar tooltip sonner.
4. Create the exact folder skeleton from README section 4 under src/. Put a minimal placeholder file
   in each empty folder (for example `.gitkeep`) so it is committed. Do not create fake features.
5. Add scripts to package.json: "typecheck": "tsc --noEmit", "format": "prettier --write .".
   Add Prettier with the Tailwind plugin.
6. Create src/lib/env.ts that validates all variables from .env.example with Zod:
   server-only variables in one schema, NEXT_PUBLIC_ ones in another. Fail fast with a clear message.
   Do not require Firebase/Razorpay variables yet (mark them optional for now).
7. Create base layout: src/app/layout.tsx (fonts, Toaster), a simple marketing home page at
   src/app/(marketing)/page.tsx with a hero ("Launch your online store in minutes"), and a
   src/app/not-found.tsx.
8. Create src/components/shared/ with: PageHeader, EmptyState, ErrorState, LoadingSkeleton components.
9. Add a .gitignore check: .env.local, .next, node_modules, supabase/.temp are ignored.

Finish with: pnpm lint, pnpm typecheck, pnpm build all passing. Then list the files you created.
```

## Manual check
- [ ] `pnpm dev` shows the home page at http://localhost:3000
- [ ] `docs/`, `prompts/`, `supabase/` are untouched
- [ ] `src/features/*` folders exist for: auth, tenants, plans, subscriptions, catalog, orders, storefront, notifications
