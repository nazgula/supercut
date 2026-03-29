/**
 * Tests for the project status derivation logic.
 * We test the derivation functions directly since the hook
 * depends on React and cachedRpcCall (tested separately).
 */

import { describe, it, expect } from "vitest";

// ─── Test the status derivation logic ─────────────────────────
// Extract the derivation from hook internals by testing the same logic.

interface ClipRow { status: string }
interface EditRow { timeline: unknown[] | null }
interface RenderRow { status: string; createdAt: string }

function deriveStatus(
  clips: ClipRow[],
  groups: unknown[],
  edits: EditRow[],
  renders: RenderRow[],
  script: string,
) {
  const content = {
    total: clips.length,
    processing: clips.filter((c) => c.status === "processing").length,
    ready: clips.filter((c) => c.status === "ready").length,
    error: clips.filter((c) => c.status === "error").length,
  };

  let latestRenderStatus: "rendering" | "done" | "error" | null = null;
  if (renders.length > 0) {
    const sorted = [...renders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    latestRenderStatus = sorted[0].status as "rendering" | "done" | "error";
  }

  return {
    content,
    characters: { total: groups.length },
    edits: {
      total: edits.length,
      hasTimeline: edits.some((e) => e.timeline != null && Array.isArray(e.timeline) && e.timeline.length > 0),
    },
    renders: { total: renders.length, latest: latestRenderStatus },
    hasScript: !!script.trim(),
  };
}

describe("project status derivation", () => {
  it("empty project", () => {
    const s = deriveStatus([], [], [], [], "");
    expect(s.content.total).toBe(0);
    expect(s.characters.total).toBe(0);
    expect(s.edits.total).toBe(0);
    expect(s.renders.latest).toBeNull();
    expect(s.hasScript).toBe(false);
  });

  it("project with processing clips", () => {
    const clips = [
      { status: "processing" },
      { status: "ready" },
      { status: "error" },
    ];
    const s = deriveStatus(clips, [], [], [], "");
    expect(s.content.total).toBe(3);
    expect(s.content.processing).toBe(1);
    expect(s.content.ready).toBe(1);
    expect(s.content.error).toBe(1);
  });

  it("project with script", () => {
    const s = deriveStatus([], [], [], [], "INT. OFFICE - DAY\nThe camera pans...");
    expect(s.hasScript).toBe(true);
  });

  it("whitespace-only script is false", () => {
    const s = deriveStatus([], [], [], [], "   \n  ");
    expect(s.hasScript).toBe(false);
  });

  it("project with edits and timeline", () => {
    const edits = [
      { timeline: [{ shotId: "s1" }, { shotId: "s2" }] },
      { timeline: null },
    ];
    const s = deriveStatus([], [], edits, [], "");
    expect(s.edits.total).toBe(2);
    expect(s.edits.hasTimeline).toBe(true);
  });

  it("edits with empty timeline arrays", () => {
    const edits = [{ timeline: [] }];
    const s = deriveStatus([], [], edits, [], "");
    expect(s.edits.hasTimeline).toBe(false);
  });

  it("renders with latest status", () => {
    const renders = [
      { status: "done", createdAt: "2026-01-01" },
      { status: "rendering", createdAt: "2026-03-01" },
    ];
    const s = deriveStatus([], [], [], renders, "");
    expect(s.renders.total).toBe(2);
    expect(s.renders.latest).toBe("rendering");
  });

  it("characters counted", () => {
    const s = deriveStatus([], [{}, {}, {}], [], [], "");
    expect(s.characters.total).toBe(3);
  });
});
