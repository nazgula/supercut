---
spec: 07
title: Homepage Redesign + Column Swap
status: todo
---

## Summary

Redesign the app shell layout: swap chat/workspace columns, remove the persistent sidebar from the landing page, and replace it with a full-screen Claude.ai-inspired welcome screen with VS Code-style recent projects.

---

## Changes

### 1. Column order swap

- **Before:** `[Sidebar] | [Workspace] | [Chat]`
- **After (project open):** `[Chat (40%)] | [Workspace (60%)]`
- No sidebar at all — sidebar is removed from the non-landing layout.

### 2. Chat column header removed

- The "Editor Assistant" header (avatar icon + label) is removed.
- Chat column is borderless at the top — messages start immediately.
- ChatLanding state (no project/no messages) remains unchanged in behavior.

### 3. Workspace header: hamburger → back-arrow

- The `☰` toggle button becomes `←`.
- Clicking it always navigates back to `{ type: "landing" }` (the home screen / project picker).
- It should be visible whenever a project is active.

### 4. Landing page: full-screen, no sidebar

When `page.type === "landing"`, render `HomeLanding` full-screen (no chat column, no workspace column, no sidebar).

#### Layout (top → bottom, centered):

```
────────────────────────────────────────────
  [top spacer ~20% height]

  Good morning, [FirstName]         ← h1, large, --color-text
  What are we editing today?        ← subtitle, --color-text-secondary

  ┌──────────────────────────────┐
  │ Describe your project…       │  ← textarea, 3 rows, centered
  │                              │
  └──────────────────────────────┘
                         [→ Start]  ← send button aligned right

  ──────────────────────────────────
  Recent Projects                   ← section heading

  [Card] [Card] [Card] [Card] [Card] ← up to 5 recent, horizontal wrap
                              More…  ← expands to show all (scrollable inline list)
────────────────────────────────────────────
```

#### Project card design:

- Fixed-height card (~120px tall, ~160px wide)
- Top strip (40px): solid color derived from project name hash → navy palette
- Body: project name (truncated), relative updated-at date
- Hover: slight lift (shadow / scale)
- Click: `setActiveProject(id)` → navigate to materials

#### Textarea behavior:

- 3 rows visible, resizable by user
- On submit (Enter without Shift, or click Start button):
  1. If text is non-empty: create project with name = first 40 chars of text, navigate to materials, store remaining text as `pendingMessage` in context so ChatColumn auto-sends it on mount.
  2. If text is empty and user presses Enter: do nothing (or optionally prompt "Describe your edit first").
- Shift+Enter = newline in textarea.

#### "More…" behavior:

- Default: show most recent 5 projects as cards.
- Click "More…": expand to show all projects in a scrollable list (switch from card grid to vertical compact list, or extend the card grid — designer call, keep consistent).
- For now: toggle `showAll` state; when `showAll` is true render all in card grid with `overflow-y-auto max-h-[400px]`.

---

## AppContext additions

Add to `AppContextValue`:
```ts
pendingMessage: string | null;
setPendingMessage: (msg: string | null) => void;
```

ChatColumn checks for `pendingMessage` on mount (or when `activeProjectId` changes), auto-sends it once, then clears it.

---

## Files affected

| File | Change |
|------|--------|
| `src/pages/AppShell.tsx` | Route landing → `HomeLanding`, project open → `<ChatColumn /><WorkspaceColumn />` (no sidebar) |
| `src/components/app/ChatColumn.tsx` | Remove header section |
| `src/components/app/WorkspaceHeader.tsx` | `☰` → `←`, navigate to landing on click |
| `src/context/AppContext.tsx` | Add `pendingMessage` + `setPendingMessage` |
| `src/components/app/HomeLanding.tsx` | New component: greeting, textarea, project cards |
| `src/components/app/ProjectSidebar.tsx` | No longer rendered (kept in repo, just unused from shell) |

---

## Out of scope

- Actual project thumbnail generation (no API support)
- Animated transitions between landing ↔ project views
- Keyboard navigation of project cards
