# 00. How to use these prompts with Antigravity

## One-time setup
1. Create an empty folder for the project and copy this kit into it
   (`README.md`, `.env.example`, `docs/`, `prompts/`, `supabase/`).
2. Open that folder as the workspace in Antigravity.
3. Make `docs/CONTEXT.md` available to the agent on every task. If Antigravity lets you save
   workspace rules or instructions, put the contents of `docs/CONTEXT.md` there. If you are not
   sure where, paste it at the start of each new task.
4. Initialise git and commit the kit before the first prompt (`git init && git add -A && git commit -m "kit"`).

## Working loop (repeat for prompts 01 to 13)
1. Open the prompt file. Copy **only the text inside the "Prompt" block**.
2. Paste it as a new task. Let the agent plan, then read the plan before approving.
3. When it finishes, run these yourself:
   `pnpm lint && pnpm typecheck && pnpm build`
4. Do the **Manual check** list at the bottom of the prompt file.
5. If something is wrong, reply in the same task with the exact error. Don't start a new task.
6. When all checks pass: `git add -A && git commit -m "prompt NN done"`.

## Rules that save you time
- **One prompt = one task.** Don't merge two prompt files into one request.
- **Never skip the database step.** Prompt 02 applies the schema. Everything after depends on it.
- If the agent wants to change the database, tell it: *"Add a new migration file instead of editing the
  existing one."* Then run `supabase db reset` and regenerate types.
- If the agent invents a table or column, tell it: *"Read supabase/migrations/20261101000000_init.sql and use only what exists there."*
- If an agent proposes a new package, ask why. Most things in this project need no extra libraries.
- For anything involving Razorpay or Firebase, tell the agent to **read the current official docs**
  rather than rely on memory: APIs change.

## Order and dependencies
```
01 scaffold ─ 02 supabase ─ 03 auth/onboarding ─ 04 tenant routing
                                   │                    │
                          05 super admin          08 storefront
                                   │                    │
                          06 billing ───── 07 vendor catalog ─ 09 orders
                                                  │
                                         10 notifications ─ 11 security ─ 12 deploy
```
05 and 07 can be done in either order after 04. 06 needs 05 (plans exist in the UI).
