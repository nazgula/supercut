/**
 * Tests for the offline cache layer (cachedRpc.ts).
 *
 * Scenarios:
 *   1. Online — API succeeds, result is cached in local SQLite
 *   2. Offline — navigator.onLine=false, cached data is returned
 *   3. Network error — rpcCall throws, cached data is returned
 *   4. Reconnect — fresh API data overwrites stale cache
 *   5. Offline with empty cache — throws clear error
 *   6. Non-cacheable method — no fallback, throws on failure
 *
 * Cleanup: all test data deleted from rpc_cache after each test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock rpcCall ─────────────────────────────────────────────
// Must be declared before importing cachedRpc so vi.mock hoists properly.

const mockRpcCall = vi.fn();

vi.mock("./rpc", () => ({
  rpcCall: (...args: unknown[]) => mockRpcCall(...args),
  RpcError: class RpcError extends Error {
    code: number;
    data?: unknown;
    constructor(code: number, message: string, data?: unknown) {
      super(message);
      this.code = code;
      this.data = data;
      this.name = "RpcError";
    }
  },
}));

// ─── Mock sql.js DB ───────────────────────────────────────────
// Use sql.js in-memory (no localStorage, no WASM file loading).

import initSqlJs, { type Database } from "sql.js";
import { readFileSync } from "fs";
import { resolve } from "path";

let testDb: Database;

vi.mock("../db/db", () => ({
  getDb: async () => testDb,
  persistDb: () => {},
}));

// ─── Import after mocks ──────────────────────────────────────

import { cachedRpcCall, clearRpcCache } from "./cachedRpc";

// ─── Setup / teardown ─────────────────────────────────────────

beforeEach(async () => {
  const SQL = await initSqlJs();
  testDb = new SQL.Database();

  // Load schema including rpc_cache table
  const schemaPath = resolve(__dirname, "../db/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  testDb.run(schema);

  mockRpcCall.mockReset();

  // Default: online
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    writable: true,
    configurable: true,
  });
});

afterEach(async () => {
  // Cleanup: delete all test data from cache table
  if (testDb) {
    testDb.run("DELETE FROM rpc_cache");
    testDb.close();
  }
});

// ─── Helpers ──────────────────────────────────────────────────

function goOffline() {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: false },
    writable: true,
    configurable: true,
  });
}

function goOnline() {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    writable: true,
    configurable: true,
  });
}

function networkError() {
  return new TypeError("Failed to fetch");
}

const MOCK_PROJECTS = {
  projects: [
    { id: "p1", name: "Test Project", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    { id: "p2", name: "Another Project", createdAt: "2026-01-02", updatedAt: "2026-01-02" },
  ],
};

const MOCK_CLIPS = {
  clips: [
    { id: "c1", title: "Clip One", status: "ready", mediaType: "video" },
  ],
  postProcessing: false,
};

// ─── Tests ────────────────────────────────────────────────────

describe("cachedRpcCall", () => {
  describe("online — caches on read", () => {
    it("returns API result and writes to cache", async () => {
      mockRpcCall.mockResolvedValueOnce(MOCK_PROJECTS);

      const result = await cachedRpcCall("projects.list");
      expect(result).toEqual(MOCK_PROJECTS);
      expect(mockRpcCall).toHaveBeenCalledWith("projects.list", {});

      // Allow async cache write to complete
      await new Promise((r) => setTimeout(r, 10));

      // Verify cache was written
      const rows = testDb.exec("SELECT * FROM rpc_cache WHERE method = 'projects.list'");
      expect(rows.length).toBe(1);
      expect(rows[0].values.length).toBe(1);

      const cachedData = JSON.parse(rows[0].values[0][3] as string);
      expect(cachedData).toEqual(MOCK_PROJECTS);
    });

    it("caches clips.list with projectId key", async () => {
      mockRpcCall.mockResolvedValueOnce(MOCK_CLIPS);

      await cachedRpcCall("clips.list", { projectId: "p1" });
      await new Promise((r) => setTimeout(r, 10));

      const rows = testDb.exec("SELECT cache_key FROM rpc_cache WHERE method = 'clips.list'");
      expect(rows[0].values[0][0]).toContain("projectId");
      expect(rows[0].values[0][0]).toContain("p1");
    });
  });

  describe("offline — reads from cache", () => {
    it("returns cached data when navigator.onLine is false", async () => {
      // First: populate cache while online
      mockRpcCall.mockResolvedValueOnce(MOCK_PROJECTS);
      await cachedRpcCall("projects.list");
      await new Promise((r) => setTimeout(r, 10));

      // Go offline
      goOffline();

      // Should return cached data without calling rpcCall
      mockRpcCall.mockClear();
      const result = await cachedRpcCall("projects.list");
      expect(result).toEqual(MOCK_PROJECTS);
      expect(mockRpcCall).not.toHaveBeenCalled();
    });

    it("returns cached data on network error (fetch failure)", async () => {
      // Populate cache
      mockRpcCall.mockResolvedValueOnce(MOCK_PROJECTS);
      await cachedRpcCall("projects.list");
      await new Promise((r) => setTimeout(r, 10));

      // Stay "online" but rpcCall throws network error
      mockRpcCall.mockRejectedValueOnce(networkError());

      const result = await cachedRpcCall("projects.list");
      expect(result).toEqual(MOCK_PROJECTS);
    });
  });

  describe("offline with empty cache", () => {
    it("throws clear error when no cached data exists", async () => {
      goOffline();

      await expect(cachedRpcCall("projects.list")).rejects.toThrow(
        "Offline — no cached data for projects.list",
      );
    });
  });

  describe("reconnect — refreshes cache", () => {
    it("overwrites stale cache with fresh API data", async () => {
      // Populate cache with v1
      mockRpcCall.mockResolvedValueOnce(MOCK_PROJECTS);
      await cachedRpcCall("projects.list");
      await new Promise((r) => setTimeout(r, 10));

      // Go offline, verify cached
      goOffline();
      const stale = await cachedRpcCall("projects.list");
      expect(stale).toEqual(MOCK_PROJECTS);

      // Reconnect with fresh data
      goOnline();
      const freshData = {
        projects: [
          { id: "p3", name: "Fresh Project", createdAt: "2026-03-01", updatedAt: "2026-03-01" },
        ],
      };
      mockRpcCall.mockResolvedValueOnce(freshData);

      const result = await cachedRpcCall("projects.list");
      expect(result).toEqual(freshData);

      // Verify cache was updated
      await new Promise((r) => setTimeout(r, 10));
      const rows = testDb.exec("SELECT data_json FROM rpc_cache WHERE method = 'projects.list'");
      const cached = JSON.parse(rows[0].values[0][0] as string);
      expect(cached).toEqual(freshData);
    });
  });

  describe("non-cacheable methods", () => {
    it("passes through to rpcCall without caching", async () => {
      const createResult = { project: { id: "new", name: "New" } };
      mockRpcCall.mockResolvedValueOnce(createResult);

      const result = await cachedRpcCall("projects.create", { name: "New" });
      expect(result).toEqual(createResult);

      await new Promise((r) => setTimeout(r, 10));
      const rows = testDb.exec("SELECT * FROM rpc_cache");
      expect(rows.length).toBe(0);
    });

    it("throws on failure with no fallback", async () => {
      mockRpcCall.mockRejectedValueOnce(networkError());

      await expect(
        cachedRpcCall("projects.create", { name: "New" }),
      ).rejects.toThrow("Failed to fetch");
    });
  });

  describe("clearRpcCache", () => {
    it("removes all cached entries", async () => {
      mockRpcCall.mockResolvedValueOnce(MOCK_PROJECTS);
      await cachedRpcCall("projects.list");
      await new Promise((r) => setTimeout(r, 10));

      await clearRpcCache();

      const rows = testDb.exec("SELECT * FROM rpc_cache");
      expect(rows.length).toBe(0);
    });
  });
});
