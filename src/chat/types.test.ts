import { describe, it, expect } from "vitest";
import { extractProjectName, parseSSELine, slidingWindow } from "./types";
import type { ChatMessage } from "./types";

// ─── extractProjectName ──────────────────────────────────────

describe("extractProjectName", () => {
  it("extracts first sentence from multi-sentence input", () => {
    expect(extractProjectName("Interview with CEO about Q2. We need to cut it down."))
      .toBe("Interview with CEO about Q2");
  });

  it("extracts first line from multi-line input", () => {
    expect(extractProjectName("Brand film for Berlin\nShoot date was last week"))
      .toBe("Brand film for Berlin");
  });

  it("capitalizes first letter", () => {
    expect(extractProjectName("quick promo for instagram"))
      .toBe("Quick promo for instagram");
  });

  it("truncates at 50 chars with ellipsis", () => {
    const long = "A very long project description that goes on and on and on and on";
    const result = extractProjectName(long);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toContain("…");
  });

  it("returns 'Untitled Project' for empty input", () => {
    expect(extractProjectName("")).toBe("Untitled Project");
    expect(extractProjectName("   ")).toBe("Untitled Project");
  });

  it("handles input with only punctuation", () => {
    expect(extractProjectName("...")).toBe("Untitled Project");
  });

  it("handles exclamation mark as sentence boundary", () => {
    expect(extractProjectName("CEO keynote! Needs to be 2 minutes"))
      .toBe("CEO keynote");
  });

  it("handles question mark as sentence boundary", () => {
    expect(extractProjectName("Can we cut a sizzle reel? From the Berlin footage"))
      .toBe("Can we cut a sizzle reel");
  });
});

// ─── parseSSELine ────────────────────────────────────────────

describe("parseSSELine", () => {
  it("parses a text event", () => {
    const result = parseSSELine('data: {"type":"text","text":"Hello"}');
    expect(result).toEqual({ type: "text", text: "Hello" });
  });

  it("parses a navigate event", () => {
    const result = parseSSELine('data: {"type":"navigate","view":"clips"}');
    expect(result).toEqual({ type: "navigate", view: "clips" });
  });

  it("parses a question event", () => {
    const result = parseSSELine('data: {"type":"question","question":"Which?","options":["A","B"]}');
    expect(result).toEqual({ type: "question", question: "Which?", options: ["A", "B"] });
  });

  it("parses a tool_start event", () => {
    const result = parseSSELine('data: {"type":"tool_start","name":"get_clips"}');
    expect(result).toEqual({ type: "tool_start", name: "get_clips" });
  });

  it("parses a done event", () => {
    const result = parseSSELine('data: {"type":"done"}');
    expect(result).toEqual({ type: "done" });
  });

  it("returns null for non-data lines", () => {
    expect(parseSSELine("event: message")).toBeNull();
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine("id: 123")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseSSELine("data: {not json}")).toBeNull();
  });

  it("returns null for empty data", () => {
    expect(parseSSELine("data: ")).toBeNull();
  });
});

// ─── slidingWindow ───────────────────────────────────────────

describe("slidingWindow", () => {
  function makeMessages(count: number): ChatMessage[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? "user" as const : "assistant" as const,
      content: `Message ${i}`,
    }));
  }

  it("returns all messages when under limit", () => {
    const msgs = makeMessages(5);
    const result = slidingWindow(msgs);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ role: "user", content: "Message 0" });
  });

  it("returns only last 20 messages when over limit", () => {
    const msgs = makeMessages(30);
    const result = slidingWindow(msgs);
    expect(result).toHaveLength(20);
    expect(result[0]).toEqual({ role: "user", content: "Message 10" });
    expect(result[19]).toEqual({ role: "assistant", content: "Message 29" });
  });

  it("strips id and streaming fields", () => {
    const msgs: ChatMessage[] = [{ id: "x", role: "user", content: "hi", streaming: true }];
    const result = slidingWindow(msgs);
    expect(result[0]).toEqual({ role: "user", content: "hi" });
    expect(result[0]).not.toHaveProperty("id");
    expect(result[0]).not.toHaveProperty("streaming");
  });

  it("returns empty array for empty input", () => {
    expect(slidingWindow([])).toEqual([]);
  });
});
