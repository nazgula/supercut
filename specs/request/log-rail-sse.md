# Request: SSE Endpoint for Clip Processing Progress
**Repo:** `video-editor` (backend)
**From:** Supercut frontend
**For:** Gadi

---

## Context

The Supercut UI has a **LogRail** component — a compact log strip at the top of the chat column that streams live backend processing output as clips are ingested. It shows lines like:

```
✓ Script verified — 4 scenes parsed
✓ momo_eating.mov — analyzing
⟳ cat_walking.mov — transcribing audio...
⟳ Detecting faces across clips...
```

This is modeled after the video-editor frontend's existing behavior (live processing feedback during upload).

## Current state

The backend has no SSE endpoint for clip processing. The only streaming endpoint is `POST /chat/stream`.

Clip processing happens in `enqueueTask` / `processClipInBackground` inside `index.ts` — all `console.log` output goes to the server log file (`logs/app.log`). There is no way for the frontend to subscribe to per-clip processing steps in real time.

The Supercut frontend currently **simulates** the log rail by polling `clips.list` every 3 seconds and deriving state changes. This works but produces coarse-grained updates ("processing" → "ready") with no visibility into what step the clip is on.

---

## Request

Add a `GET /progress/stream` SSE endpoint that clients can connect to per project.

### Proposed endpoint

```
GET /progress/stream?projectId=<uuid>&token=<accessToken>
```

Returns `Content-Type: text/event-stream`.

### Event format

```
event: clip-progress
data: {"clipId":"<uuid>","filename":"momo_eating.mov","step":"transcribing","message":"Transcribing audio...","ts":"2024-03-15T10:30:00Z"}

event: clip-progress
data: {"clipId":"<uuid>","filename":"momo_eating.mov","step":"done","message":"Analysis complete — 3 shots detected","ts":"..."}

event: clip-progress
data: {"clipId":"<uuid>","filename":"cat_walking.mov","step":"error","message":"Transcription failed — no audio","ts":"..."}

event: project-done
data: {"projectId":"<uuid>","message":"All files processed","ts":"..."}
```

### Suggested steps per clip
| `step` | Description |
|---|---|
| `queued` | Clip enqueued, waiting |
| `scene-detect` | FFmpeg scene detection running |
| `transcribing` | WhisperX running |
| `gemini-upload` | Uploading to Gemini |
| `gemini-analyze` | Gemini shot analysis running |
| `face-detect` | InsightFace running |
| `uploading` | Uploading to S3 |
| `done` | Clip ready |
| `error` | Processing failed |

### Implementation notes

- Auth: accept `?token=` query param (same pattern as `/renders/:filename` and `/uploads/:filename`)
- Keep-alive: send `: keep-alive\n\n` every 15s to prevent proxy timeouts
- Scope: one SSE connection per project, streams all clips for that project
- Cleanup: close connection after `project-done` event or on client disconnect
- Integration point: emit events from inside `processClipInBackground`, `processImageInBackground`, `processAudioInBackground` in `index.ts`

### Nice to have (but not required)
- `event: post-processing` events for face clustering steps
- Reconnect support (Last-Event-ID)

---

## Why this matters for Supercut

Supercut is a desktop app. The ingest step is one of the first things users encounter — "drop files, watch them get processed." Rich live feedback here directly affects the perceived quality of the app. Polling gives us a status LED; SSE gives us a real log rail.

The polling fallback will remain in Supercut's code until this endpoint ships, so there is no hard dependency — this is an enhancement request.
