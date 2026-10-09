# Arcanis

Competitive magic RPG: players describe a spell in natural language, an LLM generates a balanced, classified spell plus card art, and players battle with those spells.

- **App:** `phase0/` (Express + tRPC + React + Drizzle on MySQL). The name is historical; it is the canonical product codebase and stays at this path.
- **Docs:** `docs/` (the Master Doc is the source of truth; see `CLAUDE.md` for precedence).
- **Status:** `PROGRESS.md`; task checklist in `docs/tasks.md`.

```
cd phase0
pnpm install
pnpm dev            # http://localhost:3100
pnpm test && pnpm check
```

Configuration lives in a single `.env` at the repo root; `.env.example` lists the keys.
