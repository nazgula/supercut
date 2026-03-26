# Supercut — Claude Code Guide

## What this project is

Supercut is an AI-powered video editing desktop application. The primary interface is a **chat-driven editor** that understands the language of post-production and knows the full capabilities of the system. Users describe what they want; the AI assembles it.

**Current state:** React 19 + Vite SPA running in browser, backed by the `video-editor` JSON-RPC API.
**Destination:** Electron desktop app. Every architectural decision must be made with this migration in mind. Solutions that only work in a browser context (unrestricted localStorage, `window.*` APIs, service workers) are a liability — always prefer approaches that are compatible with Electron's renderer/main process model or flag them explicitly.

---

## Architecture

### Frontend
- React 19, TypeScript, Vite, React Router v7
- Tailwind CSS v4 with `@theme` block (V6 design system — navy/bone/slate palette, Sora + IBM Plex Mono, accent orange)
- State: React Context + local `useState` — no external state library
- Database (local): `sql.js` (WebAssembly SQLite) → **migrate to `better-sqlite3`** when moving to Electron

### Backend
- **`video-editor` JSON-RPC 2.0 API** — single `POST /rpc` endpoint
- All API calls go through `src/api/rpc.ts` → `rpcCall<T>(method, params)`
- File uploads: `POST /upload` (multipart)
- Chat streaming: `POST /chat/stream` (SSE)
- Auth: JWT (15-min access token, 7-day refresh), stored in localStorage → **migrate to OS keychain (`keytar`)** in Electron
- See `open_issues.md` for unresolved auth/identity questions for desktop

### Chat system
- **`supercut.md`** (project root) — the chat editor's global context: personality, editing domain knowledge, system capabilities. Shared across all video projects. Loaded by the app at startup.
- **`[project_name].md`** (created per video project) — per-project evolving context. Created when a new project starts. Updated as the project develops. Captures editorial intent, key decisions, character names, shot notes, anything the AI needs to stay oriented.
- **Storage:** Both files are stored as named files on the filesystem. In Electron, these live under `app.getPath('userData')`. In development, they live in a `data/` directory at the project root. This is intentional — plain markdown files are readable, editable by the user in any editor, and trivially backed up.

---

## Desktop migration checklist

When writing any code, keep these in mind:

- **Storage:** Prefer `better-sqlite3` patterns over `sql.js`. Avoid `localStorage` for anything that needs to survive a clear — use the DB or filesystem.
- **File paths:** Use `path.join` / `app.getPath('userData')` patterns, not `window.location` or hardcoded public paths.
- **IPC:** If functionality will eventually belong in Electron's main process (file I/O, native dialogs, OS keychain), write it in an isolated service layer so it can be swapped for an IPC call.
- **No browser-only APIs** (`navigator.mediaDevices` is fine, service workers are not).
- Flag anything that doesn't translate cleanly to Electron in `open_issues.md`.

---

## Working practices

### Branching
- Create a new branch for every feature or non-trivial fix.
- Branch naming: `feature/short-name`, `fix/short-name`, `chore/short-name`.
- Do not work directly on `main`.

### Library installs
- Do not install a library for something small you can write in <30 lines.
- For anything larger, check if there's already a suitable library in use before adding a new one.
- Justify new dependencies in the commit message.

### Big changes → specs
For any change that spans multiple files or requires architectural decisions, use the specs workflow:

```
specs/
  todo/      ← planned specs, not yet started
  done/      ← completed specs
  *.md       ← spec currently being executed (moved here from todo/)
```

**Process:**
1. Break the work into features. Write one spec file per feature, not one giant file.
2. Order the specs. Add them to `specs/todo/` with a numeric prefix (`01-auth-refactor.md`, `02-chat-context.md`).
3. Review and critique each spec before starting. Identify risks, open questions, missing pieces.
4. When executing a spec, move it from `todo/` to `specs/` (root).
5. When done, move it to `specs/done/`.

Each spec file should contain: goal, scope, implementation steps, open questions, acceptance criteria.

### Commits
- Atomic commits — one logical change per commit.
- Before committing: review the diff, run linting, run tests.
- Fix issues found in review before committing — do not commit and plan to fix later.

### Tests — 3-failure rule
If a test fails 3 times in a row without progress:
1. Stop. Do not retry the same approach.
2. Check git log for the last commit where that test passed (or did not yet exist).
3. Branch from that commit.
4. Build the minimal change that satisfies the test on the clean branch.
5. Take the insights back to the failing branch and apply them.
6. If still no progress after that, **stop and flag** — write the issue to `open_issues.md` and ask.

### Code review before commit
Always self-review before committing:
- No `console.log` left in
- No hardcoded values that should be config
- No `any` types added without comment
- No browser-only APIs without an Electron migration note
- No new dependency without justification

### open_issues.md
- Unresolved questions, known limitations, deferred decisions go here.
- Check if the issue already exists before adding.
- Append — do not overwrite.
- Include enough context so the issue is understandable cold.

---

## Key files

| Path | Purpose |
|---|---|
| `src/index.css` | V6 design system — all theme tokens defined here |
| `src/api/rpc.ts` | JSON-RPC client, token refresh, `RpcError` |
| `src/context/AuthContext.tsx` | Auth state, JWT lifecycle |
| `src/db/db.ts` | sql.js init, persistence (chunked btoa) |
| `src/db/repositories/` | One file per entity — all DB access goes here |
| `supercut.md` | Chat editor global context — loaded at app startup |
| `open_issues.md` | Unresolved issues and deferred decisions |
| `specs/` | Implementation specs (todo → executing → done) |
