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

## Backend Support Gaps

Issues discovered during v6.1 implementation. These affect what the frontend can show vs what the API provides.

### No SSE for clip processing progress
`processClipInBackground` logs to `console.log` only. Frontend can only poll `clips.list` every 3s for status changes. LogRail is simulated from polling state diffs — no step-level visibility (transcribing, face detection, etc.).
**Request spec:** `specs/request/log-rail-sse.md` — send to Gadi.

### No clip count in `projects.list`
`projects.list` returns only `{id, name, createdAt, updatedAt}`. Sidebar can't show "8 clips" per project without an extra `clips.list` call per project (too expensive on load).
**Workaround:** Show relative date only in sidebar, no clip count.

### No quality scores surfaced to client
Gemini and WhisperX produce quality assessments server-side but these are not returned in `clips.list`. The wireframe shows "Good / Low light / Sync issue" flags per clip. Frontend currently has no data to populate these.
**Workaround:** Show error flag on `clip.status === 'error'` only.

### No `brand` media type in API
API accepts video/image/audio. No brand asset type. Brand tab in Materials omitted.

### No suggestions endpoint
Wireframe shows an "Suggestions" tab on edit detail (quality issues, alt takes). Backend has no endpoint for editorial suggestions. Tab omitted from edits view.

### Text file upload not supported
`POST /upload` rejects non-video/image/audio MIME types. The wireframe script-verification flow (detect text file as script, parse into scenes) is not supported. Script is stored as plain text via `projects.updateScript` — manual paste only.

### `edits.render` requires Gemini configured server-side
`edits.render` throws error code 3004 if `GEMINI_API_KEY` not set. Frontend handles gracefully with user-facing message but has no way to know upfront if Gemini is available.

### Face detection requires Python InsightFace venv on server
`faces.detect` / `faces.detectAll` call a Python subprocess. If the venv isn't set up on the server, these calls fail silently or with an error. Frontend cannot detect this condition before calling.
