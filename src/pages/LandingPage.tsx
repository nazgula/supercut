import { Button } from "../components/ui/Button";
import { ChatBubble } from "../components/ui/ChatBubble";
import { SuggestionCard } from "../components/ui/SuggestionCard";
import { MaterialsPanel } from "../components/ui/MaterialsPanel";
import type { MaterialsPanelTab } from "../components/ui/MaterialsPanel";
import { EdlList } from "../components/ui/EdlList";
import type { EdlGroupData } from "../components/ui/EdlList";

// ─── Sample data for the app preview mockup ──────────────────

const mockTabs: MaterialsPanelTab[] = [
  {
    label: "Video",
    items: [
      { type: "video", title: "Interview_Maria.mov",  duration: "4:32", meta: "1080p · Primary",  thumbnail: true },
      { type: "video", title: "Aerial_City.mov",      duration: "0:45", meta: "4K · Opening",     thumbnail: true },
      { type: "video", title: "Team_Working.mov",     duration: "0:38", meta: "4K",               thumbnail: true, flag: { label: "Low Quality", severity: "partial" } },
    ],
  },
  {
    label: "Images",
    items: [
      { type: "image", title: "city_skyline.jpg", duration: "4K", meta: "Sunrise skyline", thumbnail: true },
      { type: "image", title: "office_exterior.jpg", duration: "4K", meta: "Establishing", thumbnail: true },
    ],
  },
  {
    label: "Audio",
    items: [
      { type: "audio", title: "VO_Narration.wav",  duration: "2:18", meta: "Voiceover" },
      { type: "audio", title: "Music_Intro.wav",   duration: "3:42", meta: "Background" },
    ],
  },
];

const mockEdlGroups: EdlGroupData[] = [
  {
    index: 1,
    title: "Logo sting",
    timecode: "00:00 → 00:03",
    strips: [{ type: "brand", name: "Logo_Animation.mov", role: "A-Roll" }],
  },
  {
    index: 2,
    title: "Interview — \"new horizons\"",
    timecode: "00:03 → 01:02",
    strips: [{ type: "video", name: "Interview_Maria.mov", role: "A-Roll", timecode: "IN 00:04" }],
  },
  {
    index: 3,
    title: "Skyline B-roll",
    timecode: "01:02 → 01:08",
    state: "selected",
    strips: [
      { type: "image", name: "city_skyline.jpg",  role: "B-Roll", timecode: "6s hold" },
      { type: "audio", name: "VO_Narration.wav",  role: "Voice",  timecode: "00:32" },
    ],
  },
  {
    index: 4,
    title: "Pending",
    timecode: "01:08 → ?",
    state: "pending",
    strips: [],
  },
];

// ─── Features list ───────────────────────────────────────────

const features = [
  {
    icon: "✦",
    title: "AI-Powered Editing",
    description:
      "Describe your edit in plain language. Supercut analyzes your footage and assembles a timeline automatically.",
  },
  {
    icon: "◈",
    title: "Scene Intelligence",
    description:
      "Every clip is broken into shots with titles, descriptions, and transcripts — ready to search and reuse.",
  },
  {
    icon: "⬡",
    title: "Character Recognition",
    description:
      "Faces are detected, clustered, and named across your entire project. Know who appears in every shot.",
  },
  {
    icon: "⟳",
    title: "Agentic Chat",
    description:
      "Refine your edit through conversation. Ask for changes, the AI updates the timeline in real time.",
  },
];

// ─── Page ────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <Features />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────

function Nav() {
  return (
    <header
      className="sticky top-0 z-50 bg-navy-900 border-b border-border-on-dark"
      style={{ height: "var(--height-nav)" }}
    >
      <div className="mx-auto max-w-6xl px-8 h-full flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-text-on-dark">
          Super<span className="text-accent-on-dark">Cut</span>
        </span>
        <nav className="flex items-center gap-6">
          <a
            href="#features"
            className="text-sm text-text-on-dark-sec hover:text-text-on-dark transition-colors"
          >
            Features
          </a>
          <button
            className="text-sm text-text-on-dark-sec hover:text-text-on-dark transition-colors cursor-pointer"
            onClick={() => (window.location.href = "/auth")}
          >
            Sign in
          </button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => (window.location.href = "/auth?signup=1")}
          >
            Get started
          </Button>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-8 pt-24 pb-16">
      {/* Badge */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-subtle bg-accent-subtle px-4 py-1.5 text-xs text-accent font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          AI video editing — now in early access
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-center text-[56px] font-bold tracking-tight text-text leading-[1.08] mb-5">
        Edit video with
        <br />
        <span className="text-accent">natural language</span>
      </h1>

      <p className="text-center text-lg text-text-secondary max-w-lg mx-auto mb-10 leading-relaxed">
        Upload your footage. Describe what you want. Supercut assembles the
        edit — shots, B-roll, transitions, and all.
      </p>

      {/* CTAs */}
      <div className="flex items-center justify-center gap-3 mb-16">
        <Button
          variant="accent"
          size="lg"
          onClick={() => (window.location.href = "/auth?signup=1")}
        >
          Start editing free
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
        >
          See how it works →
        </Button>
      </div>

      {/* App preview mockup */}
      <AppPreview />
    </section>
  );
}

function AppPreview() {
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-[0_16px_64px_rgba(30,51,64,0.10)]">
      {/* Chrome — nav bar */}
      <div className="bg-navy-900 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-navy-700" />
            <div className="w-3 h-3 rounded-full bg-navy-700" />
            <div className="w-3 h-3 rounded-full bg-navy-700" />
          </div>
          <span className="text-sm font-bold text-text-on-dark">
            Super<span className="text-accent-on-dark">Cut</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          {["Projects", "Selects", "Review", "Export"].map((item) => (
            <span
              key={item}
              className={[
                "text-[12px]",
                item === "Selects"
                  ? "text-text-on-dark border-b border-text-on-dark-sec pb-0.5"
                  : "text-text-on-dark-mut",
              ].join(" ")}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Sub bar */}
      <div className="bg-navy-700 px-5 py-2 flex items-center justify-between">
        <span className="text-[11px] font-mono text-text-on-dark-mut">
          Projects / <span className="text-text-on-dark-sec font-medium">Brand Film Q2</span> / Selects
        </span>
        <Button variant="accent" size="sm">Record Voice</Button>
      </div>

      {/* Body */}
      <div className="bg-bg p-4 grid grid-cols-[240px_1fr_260px] gap-4 min-h-[400px]">
        {/* Left: Materials */}
        <MaterialsPanel tabs={mockTabs} />

        {/* Center: EDL */}
        <EdlList groups={mockEdlGroups} />

        {/* Right: Voice session */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
            <span className="text-[13px] font-semibold text-text">Voice Session</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success-subtle text-success">
              Active
            </span>
          </div>
          <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
            <ChatBubble role="user" label="You">
              Use the skyline after she talks about new horizons
            </ChatBubble>
            <ChatBubble role="ai" label="SuperCut AI">
              Found a match. Here's what I suggest:
            </ChatBubble>
            <SuggestionCard
              text="Insert city_skyline.jpg as 6-second B-roll at 01:02 with cross-dissolve. VO continues underneath."
              confidence={92}
              preview={[
                { type: "image", name: "city_skyline.jpg" },
                { type: "audio", name: "VO_Narration.wav" },
              ]}
              onApply={() => {}}
              onEdit={() => {}}
              onDismiss={() => {}}
            />
            <ChatBubble role="user" label="You">
              Make it a hard cut
            </ChatBubble>
            <ChatBubble role="ai" label="SuperCut AI">
              Done — changed to hard cut. EDL item 03 updated.
            </ChatBubble>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Features ────────────────────────────────────────────────

function Features() {
  return (
    <section id="features" className="bg-surface border-t border-border">
      <div className="mx-auto max-w-6xl px-8 py-24">
        <h2 className="text-3xl font-bold text-text text-center mb-3 tracking-tight">
          Everything your edit needs
        </h2>
        <p className="text-text-secondary text-center mb-16 max-w-md mx-auto">
          From upload to final render — the full pipeline, powered by AI.
        </p>

        <div className="grid grid-cols-2 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-bg p-6 hover:border-accent/40 hover:shadow-[0_2px_12px_rgba(30,51,64,0.06)] transition-all"
            >
              <div className="text-xl text-accent mb-4">{f.icon}</div>
              <h3 className="text-sm font-semibold text-text mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────

function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-8 py-24 text-center">
      <h2 className="text-4xl font-bold text-text mb-4 tracking-tight">
        Ready to cut your first edit?
      </h2>
      <p className="text-text-secondary mb-8 max-w-sm mx-auto">
        No timeline scrubbing. No manual cuts. Just describe it.
      </p>
      <Button
        variant="accent"
        size="lg"
        onClick={() => (window.location.href = "/auth?signup=1")}
      >
        Create free account
      </Button>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-navy-900 border-t border-[rgba(244,242,233,0.08)]">
      <div className="mx-auto max-w-6xl px-8 py-8 flex items-center justify-between text-sm">
        <span className="font-bold text-text-on-dark">
          Super<span className="text-accent-on-dark">Cut</span>
        </span>
        <span className="text-text-on-dark-mut">© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
