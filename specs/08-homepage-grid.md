# SuperCut Homepage Redesign — Implementation Handoff

## Overview

This document specifies the new homepage layout for SuperCut. The landing page replaces the previous centered single-column design with a two-column split: chat greeting on the left, scrollable project list on the right.

Reference the `DESIGN_SYSTEM.md` for all color tokens, typography, and component patterns. This spec extends that system with grid and responsive rules.

---

## 1. Grid System

### Base: 12-column grid

The app shell uses a 12-column CSS grid. Content spans columns 2–11, with columns 1 and 12 as outer margins.

```
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|   |   Chat (40%)    |    Page (60%)         |    |
|mar|  cols 2-5       |    cols 6-11          |mar |
```

### Column assignments

| Element | Grid columns | Width |
|---------|--------------|-------|
| Left margin | 1 | ~8.3% |
| Chat column | 2–5 | 4 of 10 content cols = 40% |
| Page column | 6–11 | 6 of 10 content cols = 60% |
| Right margin | 12 | ~8.3% |

### Large screen breakpoint (xl and above: ≥1280px)

On large screens, add extra margin columns to keep content from stretching too wide:

```
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|  mar  |  Chat (40%)  |    Page (60%)     |  mar  |
|  1-2  |  cols 3-6    |    cols 7-10      |  11-12|
```

### CSS implementation

```css
.app-grid {
  display: grid;
  grid-template-columns: 1fr repeat(10, 1fr) 1fr;
  height: 100vh;
  overflow: hidden;
}

.chat-col {
  grid-column: 2 / 6;
  background: var(--color-bone-0);
  border-right: 1px solid var(--color-bone-50);
}

.page-col {
  grid-column: 6 / 12;
  background: var(--color-bone-25);
}

/* Large screens: tighter content, more margin */
@media (min-width: 1280px) {
  .chat-col { grid-column: 3 / 7; }
  .page-col { grid-column: 7 / 11; }
}
```

### Background colors

| Surface | Token | Hex |
|---------|-------|-----|
| Chat column + left margin | `--color-bone-0` | `#F4F2E9` |
| Page column + right margin | `--color-bone-25` | `#EDEBE0` |
| Column divider | `--color-bone-50` | `#E6E3D2` |

---

## 2. Viewport behavior

- **No window scroll**: `html, body { height: 100%; overflow: hidden; }`
- **Grid locks to viewport**: `.app-grid { height: 100vh; overflow: hidden; }`
- **Page column scrolls internally**: The project list scrolls within a vertically constrained content area

---

## 3. Chat Column (Landing State)

### Layout

- Vertically centered content using flexbox
- Horizontal padding: `18%` of column width (each side)
- No scroll — content is static

### Content structure

```
.chat-inner
  .greeting
    h1 — "Good afternoon, [FirstName]"
    p  — "What are we editing today?"
  .input-box
    textarea (3 rows)
    .input-actions
      button.btn-start — "Start →"
```

### Styles

**Greeting:**
- h1: `32px`, `font-semibold`, `--color-text` (navy-900)
- Subtitle: `14px`, `font-normal`, `--color-text-secondary` (slate-500)
- Gap between h1 and subtitle: `6px`
- Gap between subtitle and input box: `28px`

**Input box:**
- Background: `--color-bone-25`
- Border: `1px solid var(--color-bone-50)`
- Border radius: `--radius-md` (10px)
- Padding: `16px`

**Textarea:**
- Font: `15px`, `--font-sans`
- Color: `--color-text`
- Placeholder color: `--color-text-muted`
- No border, transparent background
- Rows: 3

**Start button:**
- Variant: `accent`
- Background: `--color-accent` (#D4763A)
- Text: white, `14px`, `font-medium`
- Padding: `10px 20px`
- Border radius: `8px`
- Aligned right within `.input-actions`

---

## 4. Page Column (Project List)

### Layout

- Padding: `20vh` top and bottom, `20%` left and right
- Project list scrolls within the constrained area

```css
.page-col {
  display: flex;
  flex-direction: column;
  padding: 20vh 20%;
  overflow: hidden;
}

.project-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
```

### Header

- Text: "RECENT PROJECTS"
- Font: `13px`, `font-medium`, uppercase, `letter-spacing: 0.5px`
- Color: `--color-text-muted`
- Margin bottom: `16px`
- Does not scroll with list

---

## 5. Project Card Component

### Structure

```
.project-card
  .card-main
    .card-thumb (72×48px)
    .card-content
      .card-name
      .card-desc
  .card-footer
    .footer-left (status flag, if any)
    .footer-right (materials count, timestamp)
```

### Dimensions

| Property | Value |
|----------|-------|
| Card border radius | `--radius-md` (10px) |
| Card border | `1px solid var(--color-bone-50)` |
| Card background | `--color-bone-0` |
| Gap between cards | `8px` |
| Main section padding | `14px 18px` |
| Footer padding | `8px 18px` |
| Thumbnail size | `72px × 48px` |
| Thumbnail border radius | `6px` |
| Gap between thumb and content | `16px` |

### Thumbnail states

1. **Placeholder** (no footage): `--color-bone-25` bg, dashed border, landscape icon at `opacity: 0.5`
2. **Real thumbnail** (after ingest): first frame of first video clip
3. **Fallback**: gradient derived from project name hash

### Card content

- Name: `15px`, `font-medium`, `--color-text`
- Description: `13px`, `font-normal`, `--color-text-secondary`, single line ellipsis
- Gap: `2px`

### Card footer

- Background: `--color-bone-50`
- Border top: `1px solid var(--color-bone-50)`
- `justify-content: space-between`

**Footer left — Status flags** (only when processing):

| Status | Label |
|--------|-------|
| Ingesting | "Ingesting" |
| Assembling | "Assembling" |
| Rendering | "Rendering" |

- Font: `11px`, `font-medium`, `--color-navy-700`

**Footer right — Metadata:**
- "N materials" · "2h ago"
- `12px`, `--color-text-muted`

### Hover

```css
box-shadow: 0 2px 8px rgba(30, 51, 64, 0.06);
```

---

## 6. SVG Icons

### Placeholder thumbnail
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <circle cx="8.5" cy="8.5" r="1.5"/>
  <path d="M21 15l-5-5L5 21"/>
</svg>
```

---

## 7. Behavior

### Textarea submission
- **Enter**: Submit
- **Shift+Enter**: New line
- On submit: create project (name = first 40 chars), navigate to materials, store text as `pendingMessage` → ChatColumn auto-sends on mount

### Project card click
`setActiveProject(id)` → navigate to materials tab

---

## 8. Files to modify

| File | Changes |
|------|---------|
| `src/pages/AppShell.tsx` | 12-col CSS grid, xl breakpoint, landing vs project routing |
| `src/components/app/HomeLanding.tsx` | Two-column layout: greeting+input left, project list right |
| `src/components/app/ProjectCard.tsx` | New component: thumb + content + footer |

---

## 9. Checklist

- [ ] 12-column CSS grid in AppShell landing layout
- [ ] xl breakpoint for large screens
- [ ] Viewport locked (no body scroll)
- [ ] Chat side: 18% horizontal padding, vertically centered
- [ ] Page side: 20vh top/bottom, 20% left/right padding, internal scroll
- [ ] ProjectCard with placeholder thumb, name, desc, footer metadata
- [ ] Hover shadow on cards
- [ ] All colors use design system tokens
