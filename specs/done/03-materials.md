# Spec 03 — Materials Page

## Goal
Full materials page: type tabs, upload zone, material list with processing states, material detail view. Wired to real API.

## Scope
- `MaterialsPage` component
- `MaterialDetailPage` component
- Upload to `POST /upload`
- Polling `clips.list` while processing
- Quality flag mapping from API data

## API
- `clips.list(projectId)` → `{ clips, postProcessing }`
  - clip: `{ id, title, filename, mediaUrl, duration, status, errorMessage, mediaType, shots[] }`
  - status: `'processing' | 'ready' | 'error'`
- Upload: `POST /upload` multipart (`file` + `projectId`)
  - Accepts: video/*, image/*, audio/*
  - Does NOT accept text files — script upload not supported (see open_issues)
- `clips.delete(projectId, clipId)`

## MaterialType mapping
- `clip.mediaType === 'video'` → type `video`
- `clip.mediaType === 'image'` → type `image`
- `clip.mediaType === 'audio'` → type `audio`
- No `brand` type from API — omit brand tab for now (flag in open_issues)

## Quality flags
- `clip.status === 'error'` → flag `{ label: 'Error', severity: 'bad' }`
- No quality scores in API (VLM analysis not returning quality metrics to client) — flag in open_issues
- Wireframe shows "Low light", "Good" etc — these come from Gemini analysis not surfaced in API

## Type tabs
- Show Video / Images / Audio (no Brand — not in API)
- Count badges from actual clip counts per type
- Default active: Video

## Upload zone
- Drag-and-drop + click to browse
- Accept: `video/*,image/*,audio/*`
- On drop: call `POST /upload` for each file with `projectId`
- While uploading: show "Uploading..." state per clip (optimistic — add processing clip to list)
- Compact version (single row) when clips exist

## Polling
- While `postProcessing === true || clips.some(c => c.status === 'processing')`:
  - Poll `clips.list` every 3 seconds
  - Stop polling when all `ready` or `error`
- Show processing state on clip card (spinner + "Processing...")

## Material card
- Reuse `MaterialItem` component (already built)
- Click → navigate to `material-detail` page

## Material detail view
- `MaterialDetailPage` component
- Shows: video/image player placeholder, filename, duration
- Tabs: Shots | Transcript
- Shots list: each shot shows title, description, timecode
- Transcript: shot.transcript.text if available, else "No transcript"
- Back button → navigate back to materials

## Acceptance criteria
- Clips load from API
- Upload works (video/image/audio)
- Processing clips show spinner, update to ready on completion
- Material detail shows shots and transcript
- Delete clip works with confirmation
