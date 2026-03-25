/**
 * Local SQLite database — powered by sql.js (WebAssembly).
 *
 * NOTE for Electron migration:
 *   Replace initDb() with better-sqlite3 and update the Database type.
 *   The repository layer stays unchanged — only this file needs to swap.
 *
 * Persistence:
 *   sql.js keeps the DB in memory. We serialise it to localStorage on every
 *   write and reload it on init. In Electron, swap localStorage for a file path.
 */

import initSqlJs, { type Database } from "sql.js";
import schemaSQL from "./schema.sql?raw";

const STORAGE_KEY = "supercut_db";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs({
    // sql.js needs its WASM binary — Vite serves it from /node_modules
    locateFile: (file) => `/${file}`,
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const buf = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run(schemaSQL);
  return _db;
}

/** Persist the in-memory DB to localStorage. Call after every write. */
export function persistDb(db: Database): void {
  const data = db.export();
  // Chunked encoding avoids "Maximum call stack exceeded" when spreading large Uint8Arrays.
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < data.length; i += CHUNK) {
    binary += String.fromCharCode(...data.subarray(i, i + CHUNK));
  }
  localStorage.setItem(STORAGE_KEY, btoa(binary));
}
