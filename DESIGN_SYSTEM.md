# Supercut Design System

Reference for designers and developers. When adding features without a designer spec, default to the patterns here. When a designer spec conflicts with this document, the spec wins — then update this document.

---

## 1. Color

All tokens are defined in `src/index.css` under `@theme` and referenced as CSS variables throughout the codebase. Never hardcode hex values — always use a token.

### Core ramp — navy → bone

The palette runs cool-dark to warm-light. Navy is for text, dark surfaces, and emphasis. Bone is for backgrounds and borders.

| Token | Hex | Use |
|---|---|---|
| `--color-navy-900` | `#1E3340` | Darkest surface (sidebar, headers on dark) |
| `--color-navy-800` | `#2A4454` | Dark surface variant |
| `--color-navy-700` | `#2F4858` | Primary dark — active tabs, links, accents on light |
| `--color-navy-600` | `#3B5968` | Hover state for navy-700 |
| `--color-slate-500` | `#4E6D78` | Secondary text, icons |
| `--color-slate-400` | `#6A8A8F` | User chat bubble background |
| `--color-slate-300` | `#8BA4A0` | Muted text, placeholders |
| `--color-bone-200` | `#C8C4B3` | Strong border |
| `--color-bone-100` | `#DBD8C8` | Mid border |
| `--color-bone-50` | `#E6E3D2` | Default border |
| `--color-bone-25` | `#EDEBE0` | App background, subtle surface |
| `--color-bone-0` | `#F4F2E9` | Card/panel surface (lightest) |

### Accent — orange

Used for primary actions, send buttons, active highlights, and brand moments. Use sparingly — one per view.

| Token | Hex | Use |
|---|---|---|
| `--color-accent` | `#D4763A` | Primary CTA buttons, active indicator dots |
| `--color-accent-hover` | `#C06830` | Hover state |
| `--color-accent-subtle` | `#F0DFD0` | Tinted background for accent context |
| `--color-accent-on-dark` | `#E8955A` | Accent on navy backgrounds |

### Semantic text aliases

| Token | Maps to | Use |
|---|---|---|
| `--color-text` | navy-900 | Body text, headings |
| `--color-text-secondary` | slate-500 | Supporting text, labels |
| `--color-text-muted` | slate-300 | Placeholders, timestamps, hints |
| `--color-text-on-dark` | bone-0 | Text on navy surfaces |
| `--color-text-on-dark-sec` | `#B8BFC4` | Secondary text on navy |
| `--color-text-on-dark-mut` | `#7A8E96` | Muted text on navy |

### Feedback colors

| Token | Hex | When |
|---|---|---|
| `--color-success` | `#3D8B5E` | Completed state, checkmarks |
| `--color-success-subtle` | `#D8EBDF` | Success background tint |
| `--color-warning` | `#C4882A` | Partial quality issue |
| `--color-warning-subtle` | `#F0E3CB` | Warning background tint |
| `--color-error` | `#C44A3F` | Error state, destructive action |
| `--color-error-subtle` | `#F2DAD7` | Error background tint (banners) |
| `--color-info` | `#4A7E9B` | Informational |
| `--color-info-subtle` | `#D6E8F0` | Info background tint |

### Material type colors

Used as left-border accents on clip/material rows.

| Token | Use |
|---|---|
| `--color-type-video` | navy-700 |
| `--color-type-audio` | slate-400 |
| `--color-type-image` | accent orange |
| `--color-type-brand` | slate-300 |

---

## 2. Typography

### Typefaces

| Role | Family | Token |
|---|---|---|
| UI / body | Sora | `--font-sans` |
| Display / headings | Sora | `--font-display` |
| Code / timecodes / labels | IBM Plex Mono | `--font-mono` |

### Size scale

Supercut uses a readable, post-production-tool scale. Sizes are set with inline `text-[Npx]` Tailwind classes throughout the codebase — there is no single theme token controlling them. When changing the scale, a global find-replace across `src/` is required.

| Size | Use |
|---|---|
| `32px` | Landing page greeting (h1) |
| `20px` | Section headings within panels |
| `18px` | Edit/clip title in detail views, landing page subtitle |
| `16px` | Body text, chat messages, tab labels, metadata |
| `14px` | Secondary labels, button text |
| `12px` | Timestamps, mono metadata, back links |
| `11px` | Flag badges, collapse controls |

### Weight conventions

- `font-semibold` (600) — h1 greeting, strong emphasis
- `font-medium` (500) — headings, tab labels, project names, button text
- `font-normal` (400) — body, metadata
- Mono labels: always `uppercase tracking-widest` or `uppercase tracking-[0.04em]`

---

## 3. Layout

### App shell — two-column, no sidebar

When a project is open:

```
┌──────────────────────┬─────────────────────────────────┐
│   Chat column (40%)  │   Workspace column (60%)        │
│   px-[10%] margins   │   ← back arrow + tabs + header  │
│                      │   p-5 content padding           │
└──────────────────────┴─────────────────────────────────┘
```

- **Chat column**: `width: 40%`, `border-right`, content padded `px-[10%]` (≈ 1 col each side on a 12-col metaphor)
- **Workspace column**: `flex-1`, header `height: 48px`, content scrollable with `p-5`
- No persistent sidebar. Navigation back to project list is via `←` in the workspace header.

### Landing page (no project open)

Full-screen, centered column, max-width `680px`, horizontally centered, `pt-[18vh]`. Contains: greeting → subtitle → chat textarea → recent project cards.

### Content max-width

Workspace content has no explicit max-width — it fills the 60% column. Landing content is capped at `680px` centered. Chat messages are capped at `max-w-[85%]` per bubble.

---

## 4. Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `6px` | Badges, tags, small chips |
| `--radius-md` | `10px` | Cards, panels, inputs, buttons |
| `--radius-lg` | `16px` | Large modals, sheet overlays |
| `--radius-xl` | `20px` | Full-bleed floating panels |

In practice: most UI elements use `rounded-lg` (Tailwind's `8px`) or `rounded-xl` (`12px`). Match the surrounding context — inputs and buttons that sit together should share the same radius.

Chat bubbles use `rounded-md rounded-br-[4px]` (user) and `rounded-md rounded-bl-[4px]` (AI) to indicate direction.

---

## 5. Borders and surfaces

- **Default border**: `1px solid var(--color-bone-50)` — used on cards, inputs, panels
- **Strong border**: `var(--color-bone-200)` — dividers inside dense panels
- **Left-accent border**: `3px solid <type-color>` — material rows, EDL entries, always on the left edge only
- **No drop shadows** except on hover states: `hover:shadow-[0_2px_8px_rgba(30,51,64,0.06)]` (subtle, warm-tinted)

Surface hierarchy (lightest to darkest background):
1. `white` — input fields
2. `--color-bone-0` — panels, cards, chat column
3. `--color-bone-25` — app background, subtle zebra rows
4. `--color-bone-50` — borders, disabled states
5. `--color-navy-900` — no longer used for sidebar; reserved for future dark-mode surfaces

---

## 6. Components

### Button (`src/components/ui/Button.tsx`)

Five variants. Use the `Button` component — don't build ad-hoc buttons except for icon-only controls (which use bare `<button>` with explicit `w-N h-N` sizing).

| Variant | When |
|---|---|
| `accent` | Primary CTA — one per view (Send, Start, Render) |
| `primary` | Secondary important action (navy background) |
| `secondary` | Bordered, neutral — Generate EDL, Back |
| `ghost` | Inline controls, icon buttons, low-emphasis actions |
| `danger` | Destructive — delete, remove |

Sizes: `sm` (h-8), `md` (h-9, default), `lg` (h-11).

Icon-only buttons (e.g. send arrow, mic): `w-9 h-9 rounded-lg`, accent or bone-50 background.

### ChatBubble (`src/components/ui/ChatBubble.tsx`)

- **User**: right-aligned, `bg-slate-400`, white text, `rounded-br-[4px]`
- **AI**: left-aligned, `bg-surface-2`, bordered, `rounded-bl-[4px]`
- Label: `10px` mono uppercase, above the message
- Body: `13px` `leading-relaxed`
- Max width: `85%` of column

### MaterialItem (`src/components/ui/MaterialItem.tsx`)

Two display modes:

**Thumbnail mode** (clip lists): `64px` thumbnail + title + flag + meta. Left border in type color.

**List mode** (compact): title + duration + flag inline. Left border in type color.

Flag badges: `9px` uppercase mono, `partial` = warning tint, `bad` = error tint.

### Input fields

No shared input component — use inline styles with this pattern:
```
className="flex-1 px-3 py-2.5 rounded-lg text-[12px] outline-none border"
style={{ borderColor: "var(--color-bone-50)", background: "white", color: "var(--color-text)" }}
```
Focus: no custom ring — `outline-none` is used everywhere. Consider adding `focus:border-navy-700` in a future pass.

### Tabs

Horizontal tab bars use `border-b-2` to show the active state:
- Active: `borderBottomColor: var(--color-navy-700)`, navy text
- Inactive: transparent border, muted text
- Height: full parent (typically `48px` header)
- Font: `11px font-medium`

Type-filter tabs (Materials page) use background fill instead: `bone-25` active, transparent inactive.

### Error / feedback banners

Inline banners (not toasts):
```
px-3 py-2.5 rounded-lg text-[11px]
background: --color-error-subtle, color: --color-error
```
Always include a `✕` dismiss button, right-aligned.

---

## 7. Spacing conventions

- **Page content padding**: `p-5` (20px)
- **Card internal padding**: `px-4 py-3` or `px-4 py-3.5`
- **Header height**: `48px`
- **Gap between list items**: `gap-1.5` (6px) for dense lists, `gap-3` (12px) for cards
- **Section spacing within a page**: `mb-4` to `mb-7`
- **Chat column content margins**: `px-[10%]` (10% of column width each side)

---

## 8. Interaction states

| State | Treatment |
|---|---|
| Hover (cards/rows) | `hover:shadow-[0_2px_8px_rgba(30,51,64,0.06)]` |
| Hover (buttons) | Variant-specific color shift (defined in Button) |
| Disabled | `opacity-50` or `opacity-40` — never hide, always dim |
| Loading (inline) | Spinner: `h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin` |
| Loading (processing clip) | `w-2 h-2` version of the same spinner pattern |
| Streaming text | Show `…` while content is empty |
| Cursor | `cursor-pointer` on all interactive elements — never rely on default |

---

## 9. Empty and loading states

Every list or data view must handle three states:

- **Loading**: centered `text-[12px]` in `--color-text-muted`, text only ("Loading…") — no skeleton screens currently
- **Empty**: centered `text-[12px]` in `--color-text-muted`, descriptive ("No video files yet")
- **Error**: inline banner (see above) — never silent

---

## 10. Do / Don't

**Do:**
- Use CSS variable tokens for every color — no raw hex
- Keep type sizes within the scale above
- Use `cursor-pointer` on every `<button>`
- One accent-colored CTA per view
- Left-border accent (3px) to identify material type in list rows

**Don't:**
- Don't add a `console.log` and ship it
- Don't use `any` without a comment
- Don't add drop shadows beyond the approved hover shadow
- Don't use `localStorage` for anything that needs to survive a clear
- Don't use service workers or browser-only APIs (Electron migration)
- Don't introduce a new color — extend the token list and update this document instead
- Don't build a new icon-only button component — use bare `<button>` with `w-9 h-9 rounded-lg`
