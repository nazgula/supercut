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
- **Future:** project settings (frame rate, aspect ratio, etc.)

**Add:** `projects.update` RPC method (accepts `name`, `description`) + `update_project` MCP tool.

### `projects.list` with summary counts (HIGH)
Frontend needs clip count, character count, edit count, and processing status per project for the `ProjectStatusCard` — without making 3 separate API calls per project.

**Add:** optional `include: ["counts"]` param to `projects.list` that returns `{ clipCount, characterCount, editCount, processingStatus }` per project.

**Related previous issue:** "No clip count in `projects.list`" — this is the same gap.

### Clip processing SSE (MEDIUM)
`processClipInBackground` logs to `console.log` only. Frontend can only poll `clips.list` every 3s for status changes. LogRail is simulated from polling state diffs — no step-level visibility (transcribing, face detection, etc.).

**Add:** SSE endpoint for clip processing progress (step name, percentage, errors in real-time).

**Request spec:** `specs/request/log-rail-sse.md` — send to Gadi.

### Project status derivation (MEDIUM)
Frontend needs to show whether a project is idle, ingesting, rendering, or assembling. Currently derived from polling `clips.list` for `status === "processing"`. No single source of truth.

**Options:**
- Add `status` field to `projects` table (backend updates on state changes)
- Or: add a `projects.status` RPC that returns derived status from child entities
- Or: include `processingStatus` in `projects.list` with counts (see above)

### `clips.update` / `shots.update` RPC + MCP tools (MEDIUM)
No way to update clip or shot title/description via RPC. Chat agent and UI both need this for:
- Renaming clips after user reviews them
- Adding shot notes / descriptions
- Correcting auto-generated titles

**Add:** `clips.update` and `shots.update` RPC methods + `update_clip`, `update_shot` MCP tools.

### Quality scores surfaced to client (LOW)
Gemini and WhisperX produce quality assessments server-side but these are not returned in `clips.list`. The wireframe shows "Good / Low light / Sync issue" flags per clip. Chat agent could also report quality issues.

**Add:** `qualityFlags` field to clip response in `clips.list`.

### Chat system prompt per project (LOW — future)
The `supercut.md` global context and `[project_name].md` per-project context described in CLAUDE.md aren't loaded or sent to the chat backend yet. When the backend chat agent gets a system prompt, it should include both the global editing persona and the per-project context (editorial intent, character notes, decisions).

This is a backend concern — the frontend sends `projectId` and the backend assembles the full prompt.

### Gemini availability check (LOW)
`edits.render` throws error code 3004 if `GEMINI_API_KEY` not set. Frontend handles gracefully but cannot check upfront.

**Add:** `system.status` RPC returning `{ gemini: boolean, insightface: boolean }`.

---

## Other Backend Gaps

### No `brand` media type in API
API accepts video/image/audio. No brand asset type. Brand tab in Materials omitted.

### No suggestions endpoint
Wireframe shows a "Suggestions" tab on edit detail (quality issues, alt takes). Backend has no endpoint for editorial suggestions. Chat agent could potentially provide this via conversation instead of a dedicated endpoint.

### Text file upload not supported
`POST /upload` rejects non-video/image/audio MIME types. Script is stored as plain text via `projects.updateScript` — manual paste only.

### Face detection requires Python InsightFace venv on server
`faces.detect` / `faces.detectAll` call a Python subprocess. If the venv isn't set up on the server, these calls fail silently or with an error. Frontend cannot detect this condition before calling.
