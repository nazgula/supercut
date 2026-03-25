import { v4 as uuidv4 } from "uuid";
import { getDb, persistDb } from "../db";

export interface Character {
  id: string;
  clipId: string | null;
  name: string;
  nickname: string | null;
  description: string | null;
  appearance: string | null;
  firstAppearanceTime: number | null;
  frameUrl: string | null;
  sheetUrl: string | null;
  createdAt: string;
}

function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    clipId: (row.clip_id as string | null) ?? null,
    name: row.name as string,
    nickname: (row.nickname as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    appearance: (row.appearance as string | null) ?? null,
    firstAppearanceTime: (row.first_appearance_time as number | null) ?? null,
    frameUrl: (row.frame_url as string | null) ?? null,
    sheetUrl: (row.sheet_url as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listCharacters(clipId?: string): Promise<Character[]> {
  const db = await getDb();
  const result = clipId
    ? db.exec("SELECT * FROM characters WHERE clip_id = ? ORDER BY created_at ASC", [clipId])
    : db.exec("SELECT * FROM characters ORDER BY created_at ASC");
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToCharacter(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function insertCharacter(data: Omit<Character, "id" | "createdAt">): Promise<Character> {
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO characters (id, clip_id, name, nickname, description, appearance, first_appearance_time, frame_url, sheet_url, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, data.clipId, data.name, data.nickname ?? null, data.description ?? null,
     data.appearance ?? null, data.firstAppearanceTime ?? null, data.frameUrl ?? null, data.sheetUrl ?? null, now]
  );
  persistDb(db);
  return { ...data, id, createdAt: now };
}

export async function updateCharacter(id: string, fields: Partial<Pick<Character, "name" | "nickname" | "description" | "appearance" | "frameUrl" | "sheetUrl">>): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (fields.name !== undefined)        { sets.push("name = ?");        values.push(fields.name); }
  if (fields.nickname !== undefined)    { sets.push("nickname = ?");    values.push(fields.nickname); }
  if (fields.description !== undefined) { sets.push("description = ?"); values.push(fields.description); }
  if (fields.appearance !== undefined)  { sets.push("appearance = ?");  values.push(fields.appearance); }
  if (fields.frameUrl !== undefined)    { sets.push("frame_url = ?");   values.push(fields.frameUrl); }
  if (fields.sheetUrl !== undefined)    { sets.push("sheet_url = ?");   values.push(fields.sheetUrl); }

  if (!sets.length) return;
  values.push(id);
  db.run(`UPDATE characters SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteCharacter(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM characters WHERE id = ?", [id]);
  persistDb(db);
}
