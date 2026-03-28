/**
 * Write-through cache layer for rpcCall.
 *
 * - Online: calls rpcCall(), caches the result in local SQLite, returns it.
 * - Offline / network error: reads from the local cache and returns stale data.
 * - Non-cacheable methods: always pass through to rpcCall() with no fallback.
 */

import { rpcCall, RpcError } from "./rpc";
import { getDb, persistDb } from "../db/db";

// ─── Cacheable methods ──────────────────────────────────────

const CACHEABLE_METHODS = new Set([
  "projects.list",
  "clips.list",
  "edits.list",
  "edits.renders",
  "faces.list",
  "faces.appearances",
]);

// ─── Cache key ──────────────────────────────────────────────

function cacheKey(method: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return `${method}:${sorted}`;
}

// ─── Write to cache ─────────────────────────────────────────

async function writeCache(
  key: string,
  method: string,
  params: Record<string, unknown>,
  data: unknown,
): Promise<void> {
  const db = await getDb();
  db.run(
    `INSERT OR REPLACE INTO rpc_cache (cache_key, method, params_json, data_json, cached_at)
     VALUES (?, ?, ?, ?, ?)`,
    [key, method, JSON.stringify(params), JSON.stringify(data), new Date().toISOString()],
  );
  persistDb(db);
}

// ─── Read from cache ────────────────────────────────────────

async function readCache<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const result = db.exec("SELECT data_json FROM rpc_cache WHERE cache_key = ?", [key]);
  if (!result.length || !result[0].values.length) return null;
  return JSON.parse(result[0].values[0][0] as string) as T;
}

// ─── Network error detection ────────────────────────────────

function isNetworkError(err: unknown): boolean {
  // fetch throws TypeError on network failure
  if (err instanceof TypeError) return true;
  // Our RpcError wraps HTTP failures — treat 0, 502, 503, 504 as network issues
  if (err instanceof RpcError && (err.code === -32603 || err.code === 0)) {
    const msg = err.message.toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("http 0")) {
      return true;
    }
  }
  return false;
}

// ─── Public API ─────────────────────────────────────────────

export async function cachedRpcCall<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const cacheable = CACHEABLE_METHODS.has(method);
  const key = cacheable ? cacheKey(method, params) : "";

  // If clearly offline and cacheable, skip the network call entirely
  if (cacheable && typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = await readCache<T>(key);
    if (cached !== null) return cached;
    throw new RpcError(-1, `Offline — no cached data for ${method}`);
  }

  try {
    const result = await rpcCall<T>(method, params);

    // Write-through: cache on success
    if (cacheable) {
      // Fire and forget — don't block the return on cache write
      writeCache(key, method, params, result).catch(() => {});
    }

    return result;
  } catch (err) {
    // For cacheable methods, fall back to local cache on network errors
    if (cacheable && isNetworkError(err)) {
      const cached = await readCache<T>(key);
      if (cached !== null) return cached;
    }
    throw err;
  }
}

// ─── Cache management ───────────────────────────────────────

export async function clearRpcCache(): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM rpc_cache");
  persistDb(db);
}
