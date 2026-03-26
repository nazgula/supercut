# Spec 04 — Characters Page

## Goal
Characters page: face group grid and detail view with appearances list. Wired to real API.

## API
- `faces.list(projectId)` → `{ groups: [{id, label, nickname, description, imageUrl, detectionCount, clipIds}] }`
- `faces.appearances(groupId)` → `{ clips: [{clipId, clipTitle, videoUrl, clipDuration, ranges: [{start, end, bestFrameUrl}]}] }`
- `faces.rename(projectId, groupId, label, nickname?)` → renames character
- `faces.delete(projectId, groupId)` → requires confirmation
- `faces.recluster(projectId)` → trigger re-scan

## Characters grid
- Only shown after materials are processed (Characters tab enabled when at least 1 clip is `ready`)
- Grid: `repeat(auto-fill, minmax(140px, 1fr))`
- Card: thumbnail from `group.imageUrl`, display name = `group.nickname || group.label`, clip count from `group.clipIds.length`
- Empty state: "No characters detected yet. Upload footage to detect faces."
- Click → navigate to `character-detail`

## Character detail
- Back button → navigate to `characters`
- Photo: `group.imageUrl`
- Name: `group.nickname || group.label`
- Label: `group.label` (AI-generated description)
- Description: `group.description`
- Tabs: Appearances (only tab for now — Profile is future)
- Appearances list: from `faces.appearances(groupId)`
  - Each appearance: clip title + time range formatted as `M:SS – M:SS`
  - Thumbnail: `range.bestFrameUrl` if available, else placeholder

## Rename
- Inline edit on character name click (or chat-driven — chat spec handles the command)
- Direct API call: `faces.rename(projectId, groupId, newName)`
- No confirmation needed

## Delete
- Requires confirmation dialog: "Delete [name]? This cannot be undone."
- API call: `faces.delete(projectId, groupId)`
- On success: navigate back to characters list, refresh

## Re-scan button
- "Re-scan All Clips" button in page header
- Calls `faces.recluster(projectId)`
- Show loading state during call

## Acceptance criteria
- Face groups load from API
- Character detail shows appearances with timestamps
- Rename works inline
- Delete works with confirmation
- Re-scan button triggers recluster
