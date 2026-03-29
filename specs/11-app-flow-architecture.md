---
spec: 11
title: App Flow Architecture — Workspace + Chat Integration
status: executing
revision: 2
---

## Overview

End-to-end project lifecycle, workspace pages, chat behavior. Implementation broken into small testable deliverables.

---

## Project Status: Concurrent Tracks (not linear)

Projects don't follow a single linear path. Users can upload more content while reviewing an EDL. The status model uses **concurrent tracks**:

```
Track: Content    [empty → uploading → processing → ready]  (restartable anytime)
Track: Characters [pending → detected → reviewed]           (depends on content)
Track: Edit       [no_script → has_script → edl → review]   (iterates)
Track: Output     [no_render → rendering → screening]        (iterates)
```

Overall project status is the combination. "Processing 2 clips, EDL under review, 1 render complete."

### `useProjectStatus` hook — single source of truth

```ts
function useProjectStatus(projectId: string): {
  content: { total: number; processing: number; ready: number; error: number };
  characters: { total: number };
  edits: { total: number; hasTimeline: boolean };
  renders: { total: number; latest: "rendering" | "done" | "error" | null };
  hasScript: boolean;
}
```

Uses `cachedRpcCall` — works offline from cache. Used by both chat (system messages) and workspace (UI state).

---

## Workspace Pages

| Page | Status | Backend support |
|---|---|---|
| Materials | Exists | `clips.list`, `POST /upload`, `clips.reprocess` |
| Script | **Phase 1a** | `projects.getScript`, `projects.updateScript` |
| Characters | Exists | `faces.list`, `faces.rename`, `faces.recluster` |
| Selects | **Needs backend** | No endpoint — flagged in OPEN_ISSUES |
| Edits (EDL) | Exists | `edits.list`, `edits.create`, `edits.render`, `edits.renderVideo` |
| Screening | **Phase 1c** | `edits.renders` (video URL), rest is frontend |

---

## Chat Message Roles

| Role | Source | Sent to backend? | Styling |
|---|---|---|---|
| `user` | User typed | Yes | User bubble (right, slate) |
| `assistant` | Backend AI | Yes | Editor bubble (left, surface-2) |
| `system` | Frontend events | **No** | Editor bubble (same as assistant) |

System messages are the Editor's voice, generated locally. The user doesn't need to know whether "Render complete" came from Claude or the app. Sliding window filter strips them before API calls.

---

## Implementation Phases

### Phase 1a: Foundation (current)
- `useProjectStatus` hook — derives project state from cached API data
- Error visibility in MaterialsPage — show `errorMessage` text, reprocess button
- Script workspace page — view/edit/verify script, `projects.getScript`/`updateScript`
- **Tests + manual checkpoint**

### Phase 1b: Upload flow
- Script detection on file upload (`.txt`, `.fountain`, `.fdx` extensions)
- Auto-navigate to Script page when script file detected
- **Manual checkpoint**

### Phase 1c: Screening + EDL history
- Screening page — video player, render list (latest first), remarks
- EDL naming — uses existing `edits.update`
- **Manual checkpoint**

### Phase 2a: System messages
- Add `role: "system"` to `ChatMessage` type
- Welcome message as system message (replace `ProjectStatusCard` component)
- Clip processing status → system messages (from polling diffs)
- Filter system messages from sliding window before API calls

### Phase 2b: Chat guidance
- State-aware nudges using `useProjectStatus`:
  - New project, no script → "Start with your script for better results"
  - Processing complete → summary with counts
  - EDL built → "N suggestions to review"
  - Render complete → navigate to screening

### Phase 3: Backend-dependent features (as tools become available)
- Selects page (needs `selects.generate`)
- Render options (needs `edits.renderVideo` params)
- Agentic project naming (needs `projects.update`)
- Processing SSE (needs backend SSE endpoint)

---

## Event Bus

Workspace pages emit `supercut:*` CustomEvents. Chat listens and generates system messages.

| Event | Emitted by | System message |
|---|---|---|
| `supercut:upload-started` | MaterialsPage | "Uploading N files..." |
| `supercut:clip-ready` | MaterialsPage (polling) | "✓ [name] — N shots" |
| `supercut:clip-error` | MaterialsPage (polling) | "✗ [name]: [error]" |
| `supercut:processing-done` | MaterialsPage (polling) | Summary card |
| `supercut:script-detected` | MaterialsPage (upload) | "Found script: [name]" |
| `supercut:edl-built` | EditsPage | "EDL ready" |
| `supercut:render-done` | EditDetailPage (polling) | "Render complete" |

CustomEvents are fine for now. If event count exceeds ~10, extract a typed emitter class.

---

## Backend Requests

See OPEN_ISSUES.md — 15 prioritized requests. Key blockers for Phase 3:
- `projects.update` (naming, description, duration)
- `selects.generate` (selects page)
- `edits.renderVideo` params (render options)
- Processing SSE (step-level progress)
