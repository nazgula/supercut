import { Button } from "../components/ui/Button";

const features = [
  {
    icon: "✦",
    title: "AI-Powered Editing",
    description:
      "Describe your edit in plain language. Gemini analyzes your footage and assembles a timeline automatically.",
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

function Nav() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md"
      style={{ height: "var(--height-nav)" }}
    >
      <div className="mx-auto max-w-6xl px-8 h-full flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-text">
          super<span className="text-primary">cut</span>
        </span>
        <nav className="flex items-center gap-6">
          <a href="#features" className="text-sm text-text-muted hover:text-text transition-colors">
            Features
          </a>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/auth")}>
            Sign in
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/auth?signup=1")}>
            Get started
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-8 pt-28 pb-24 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary-muted bg-primary-muted px-4 py-1.5 text-xs text-primary font-medium mb-8">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        AI video editing — now in early access
      </div>

      <h1 className="text-6xl font-bold tracking-tight text-text leading-[1.1] mb-6">
        Edit video with
        <br />
        <span className="text-primary">natural language</span>
      </h1>

      <p className="text-xl text-text-muted max-w-xl mx-auto mb-10 leading-relaxed">
        Upload your footage. Describe what you want. Supercut assembles the
        edit — shots, captions, transitions, and all.
      </p>

      <div className="flex items-center justify-center gap-4">
        <Button size="lg" onClick={() => (window.location.href = "/auth?signup=1")}>
          Start editing free
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
        >
          See how it works →
        </Button>
      </div>

      {/* Preview mockup */}
      <div className="mt-20 rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-2">
          <span className="h-3 w-3 rounded-full bg-border" />
          <span className="h-3 w-3 rounded-full bg-border" />
          <span className="h-3 w-3 rounded-full bg-border" />
          <span className="ml-2 text-xs text-text-faint font-mono">supercut — editor</span>
        </div>
        <div className="h-80 flex items-center justify-center text-text-faint text-sm">
          <span className="opacity-40">[ editor preview ]</span>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-8 py-24">
        <h2 className="text-3xl font-bold text-text text-center mb-4">
          Everything your edit needs
        </h2>
        <p className="text-text-muted text-center mb-16 max-w-md mx-auto">
          From upload to final render — the full pipeline, powered by AI.
        </p>

        <div className="grid grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface-2 p-6 hover:border-primary/40 transition-colors"
            >
              <div className="text-2xl text-primary mb-4">{f.icon}</div>
              <h3 className="text-base font-semibold text-text mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-8 py-24 text-center">
      <h2 className="text-4xl font-bold text-text mb-4">
        Ready to cut your first edit?
      </h2>
      <p className="text-text-muted mb-8 max-w-sm mx-auto">
        No timeline scrubbing. No manual cuts. Just describe it.
      </p>
      <Button size="lg" onClick={() => (window.location.href = "/auth?signup=1")}>
        Create free account
      </Button>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-8 py-8 flex items-center justify-between text-sm text-text-faint">
        <span>
          super<span className="text-primary">cut</span>
        </span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
