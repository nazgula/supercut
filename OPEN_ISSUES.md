# Open Issues

## Authentication & Identity for Desktop App

**Current state:** Supercut uses standard JWT auth (email + password login) stored in
localStorage. This works for web and basic Electron, but is not the right long-term
solution for a native desktop distribution.

**What needs to be resolved:**

- How does a packaged Electron/native app identify itself to the API server?
- Should each installation get a fixed API key? If so, how is it provisioned and tied to a user account?
- Should we implement OAuth 2.0 Device Flow (RFC 8628) — the standard used by GitHub CLI, VS Code, Figma — where the desktop app authenticates via a browser session on supercut.com?
- Where does billing/credits live — per user account, per installation, per team?
- Is there a supercut.com web identity provider, or is everything self-contained?
- Token storage in production: OS keychain (`keytar`) instead of localStorage
- Offline usage: does the app need to work without internet?

**Talk to Gadi before implementing.**

---

## Frontend — In Progress

### Status card → real chat message (PIN)
The project status card (welcome back + counts) is currently a hardcoded React component rendered as a special first element in the message list. It should be refactored into a system-generated `ChatMessage` pushed into the `messages[]` array on project entry — built from cached API data, rendered as a normal AI bubble. No special component needed.

### Chat connected to clip processing
When uploading a video, clip processing events (transcription, face detection, shot analysis) should surface in the chat column — either as streaming updates or as a summary message when processing completes. Currently the LogRail polls `clips.list` every 3s and shows state diffs. The chat is not notified. Needs investigation: does the backend emit anything during processing that the frontend could consume?

---

## Backend Requests — Chat-Driven Workflow

These are needed to support the chat architecture (spec 10) and agentic project management. Ordered by priority.

### `projects.update` RPC + `update_project` MCP tool (HIGH)
Currently no way to rename or update a project after creation. Needed for:
- **Agentic project naming:** chat agent suggests a name based on user's intent, user confirms, agent renames via tool
- **Project description:** editorial intent, brief text
- **Desired output duration:** e.g. "make me a 2-minute cut"

**Add:** `projects.update` RPC method (accepts `name`, `description`, `duration`) + `update_project` MCP tool.
**Schema:** Add `description TEXT` and `target_duration REAL` columns to `projects` table.

### Render options in `edits.renderVideo` (HIGH)
Currently hardcoded to 1920x1080/30fps/h264. Frontend needs to pass resolution/quality.

**Add:** optional `width`, `height`, `fps`, `quality` params to `edits.renderVideo`.
Presets: 720p, 1080p, 4K.

### Selects / darlings endpoint (HIGH)
AI-generated best moments from footage analysis. No endpoint or MCP tool exists.

**Add:** `selects.generate` RPC (params: `projectId`, criteria like "high emotion", "good alternatives") + `get_selects` MCP tool.
Returns: array of `{ shotId, clipId, score, reason, category }`.
Categories: "darling", "alternative", "b-roll candidate".

### `projects.list` with summary counts (MEDIUM)
Frontend needs clip count, character count, edit count, and processing status per project — without 3 separate API calls per project.

**Add:** optional `include: ["counts"]` param to `projects.list` that returns `{ clipCount, characterCount, editCount, processingStatus }` per project.

### Clip processing SSE (MEDIUM)
`processClipInBackground` logs to `console.log` only. Frontend polls `clips.list` every 3s. No step-level visibility.

**Add:** SSE endpoint for clip processing progress (step name, percentage, errors in real-time).
**Request spec:** `specs/request/log-rail-sse.md`

### `clips.update` / `shots.update` RPC + MCP tools (MEDIUM)
No way to update clip or shot title/description via RPC. Needed for renaming clips, adding shot notes, correcting auto-generated titles.

**Add:** `clips.update` and `shots.update` RPC methods + `update_clip`, `update_shot` MCP tools.

### Rich error details in processing (MEDIUM)
`clips.list` returns `errorMessage` but it's often a raw stack trace or "error". Frontend needs structured error info: which processing step failed (transcription? Gemini? face detection?), whether it's retryable.

**Add:** `errorStep` and `retryable` fields to clip response.

### Quality scores surfaced to client (MEDIUM)
Gemini and WhisperX produce quality assessments server-side but these are not returned in `clips.list`. Needed for quality flags per clip and for chat to report quality issues.

**Add:** `qualityFlags` field to clip response in `clips.list`.

### Suggestions endpoint (MEDIUM)
Editorial suggestions: quality issues, missing coverage vs script, alternative takes. Could be a dedicated endpoint or an MCP tool the chat agent uses.

**Add:** `suggestions.generate` RPC (params: `projectId`, `editId`) or `get_suggestions` MCP tool.
Returns: `{ type, message, affectedShots, suggestedAction }[]`.

### Chat system prompt per project (LOW)
`supercut.md` global context and `[project_name].md` per-project context aren't loaded by the backend chat agent yet. Backend should assemble the full prompt from both files + project state.

### Premiere XML export (LOW)
No endpoint. Can likely be frontend-only: generate XML from EDL timeline data. But backend could also provide `edits.exportPremiere` for more reliable output.

### `system.status` RPC (LOW)
Frontend can't check if Gemini or InsightFace are configured before calling endpoints that require them.

**Add:** `system.status` RPC returning `{ gemini: boolean, insightface: boolean }`.

### Text file upload via `POST /upload` (LOW)
Currently rejects non-media MIME types. Script files (`.txt`, `.fountain`, `.fdx`) can't be uploaded via the standard upload endpoint. Frontend works around this by reading the file client-side and calling `projects.updateScript`.

### Resumable clip processing (LOW)
`clips.reprocess` restarts the full pipeline (WhisperX → Gemini → face detection). No way to resume from the step that failed. Full cost each time.

**Consider:** `clips.reprocess` accepting a `fromStep` param.

---

## Other Backend Gaps

### No `brand` media type in API
API accepts video/image/audio. No brand asset type. Brand tab in Materials omitted.

### Face detection requires Python InsightFace venv on server
`faces.detect` / `faces.detectAll` call a Python subprocess. If the venv isn't set up, calls fail silently. Frontend cannot detect this condition before calling.
