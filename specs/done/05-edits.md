# Spec 05 — Edits Page

## Goal
Edits page: list view, edit detail with EDL / Renders tabs (no Suggestions — not in API). Wired to real API.

## API
- `edits.list(projectId)` → `{ edits: [{id, title, prompt, renderPath, timeline, timelineModified}] }`
- `edits.create(projectId, title, prompt)` → `{ edit }`
- `edits.update(editId, prompt)` → resets timeline
- `edits.delete(editId)` → requires confirmation
- `edits.render(editId)` → Gemini generates timeline (may be unavailable — handle gracefully)
- `edits.renderVideo(editId, timeline)` → starts async render, returns `{ renderId }`
- `edits.renderVideoStatus(renderId)` → poll for render status
- `edits.renders(editId)` → `{ renders: [{id, status, videoUrl, errorMessage, createdAt, completedAt}] }`

## Edits list
- Each row: edit title + render count
- Click → navigate to `edit-detail`
- "+ New Edit" button → shows inline name input or delegates to chat

## Edit detail
Header:
- Back button → edits list
- Edit title (editable inline)
- "Generate EDL" button → calls `edits.render(editId)` (requires Gemini; show error gracefully if unavailable)
- "Render Video" button → calls `edits.renderVideo(editId, timeline)` (enabled only when timeline exists)

Tabs:
- **EDL** — shows timeline as list
- **Renders** — shows render history

No Suggestions tab — not supported by API (see open_issues)

## EDL tab
- If no timeline: "No EDL yet. Use 'Generate EDL' to build one from your footage."
- Timeline is `edit.timeline` — array of `{clip_id, shot_id, label, transition?, captions?}`
  - Each row shows: index, label, source clip title (lookup from clips), shot timecodes, transition if set
  - Clip titles need to be looked up from the clips list (projectId → clips.list)
- "Generate EDL" rebuilds timeline from Gemini — clears existing
- EDL is read-only for now (editing via chat in spec 07)

## Renders tab
- Load from `edits.renders(editId)`
- Each render: filename (renderId.mp4), status badge, duration if available, timestamp, download link
- While render in progress: poll `edits.renderVideoStatus(renderId)` every 3s
- Download: `<a href={videoUrl}>` — presigned S3 redirect via backend

## Render flow
1. User clicks "Render Video"
2. Call `edits.renderVideo(editId, timeline)` → get `renderId`
3. Navigate to Renders tab
4. Poll `edits.renderVideoStatus(renderId)` every 3s
5. On `status === 'done'`: show download link, stop polling
6. On `status === 'error'`: show error message

## API gap — Suggestions
- Wireframe shows Suggestions tab with quality flags and alt takes
- Backend has no suggestions endpoint — editorial suggestions not generated
- Omit Suggestions tab entirely for now
- Log in open_issues.md

## Acceptance criteria
- Edits load from API
- Create edit works
- Generate EDL works (graceful error if Gemini unavailable)
- Render Video triggers render, polling updates status
- Renders list shows history with download links
- Delete edit works with confirmation
