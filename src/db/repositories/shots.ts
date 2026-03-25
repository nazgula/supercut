import { v4 as uuidv4 } from "uuid";
import { getDb, persistDb } from "../db";
import { parseJsonOrNull } from "../utils";

export interface Transcript {
  text: string;
  words: { word: string; start: number; end: number }[];
  segments: { speaker: string; text: string; start: number; end: number }[];
}

export interface Shot {
  id: string;
  clipId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  transcript: Transcript | null;
  createdAt: string;
}

function rowToShot(row: Record<string, unknown>): Shot {
  return {
    id: row.id as string,
    clipId: row.clip_id as string,
    title: row.title as string,
    description: row.description as string,
    startTime: row.start_time as number,
    endTime: row.end_time as number,
    transcript: parseJsonOrNull<Transcript>(row.transcript),
    createdAt: row.created_at as string,
  };
}

export async function listShots(clipId: string): Promise<Shot[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM shots WHERE clip_id = ? ORDER BY start_time ASC", [clipId]);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToShot(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function insertShot(data: Omit<Shot, "id" | "createdAt"> & { id?: string }): Promise<Shot> {
  const db = await getDb();
  const id = data.id ?? uuidv4();
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO shots (id, clip_id, title, description, start_time, end_time, transcript, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [id, data.clipId, data.title, data.description, data.startTime, data.endTime,
     data.transcript ? JSON.stringify(data.transcript) : null, now]
  );
  persistDb(db);
  return { ...data, id, createdAt: now };
}

export async function updateShot(id: string, fields: Partial<Pick<Shot, "title" | "description" | "transcript">>): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (fields.title !== undefined)      { sets.push("title = ?");      values.push(fields.title); }
  if (fields.description !== undefined){ sets.push("description = ?"); values.push(fields.description); }
  if (fields.transcript !== undefined) { sets.push("transcript = ?"); values.push(fields.transcript ? JSON.stringify(fields.transcript) : null); }

  if (!sets.length) return;
  values.push(id);
  db.run(`UPDATE shots SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteShot(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM shots WHERE id = ?", [id]);
  persistDb(db);
}
