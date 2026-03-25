import { v4 as uuidv4 } from "uuid";
import { getDb, persistDb } from "../db";

export interface Project {
  id: string;
  name: string;
  script: string | null;
  postProcessing: boolean;
  createdAt: string;
  updatedAt: string;
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    script: (row.script as string | null) ?? null,
    postProcessing: row.post_processing === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM projects ORDER BY created_at DESC");
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    rowToProject(Object.fromEntries(columns.map((c, i) => [c, row[i]])))
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM projects WHERE id = ?", [id]);
  if (!result.length || !result[0].values.length) return null;
  const { columns, values } = result[0];
  return rowToProject(Object.fromEntries(columns.map((c, i) => [c, values[0][i]])));
}

export async function insertProject(name: string): Promise<Project> {
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO projects (id, name, script, post_processing, created_at, updated_at) VALUES (?,?,NULL,0,?,?)",
    [id, name, now, now]
  );
  persistDb(db);
  return { id, name, script: null, postProcessing: false, createdAt: now, updatedAt: now };
}

export async function updateProject(id: string, fields: Partial<Pick<Project, "name" | "script" | "postProcessing">>): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (fields.name !== undefined)           { sets.push("name = ?");            values.push(fields.name); }
  if (fields.script !== undefined)         { sets.push("script = ?");          values.push(fields.script); }
  if (fields.postProcessing !== undefined) { sets.push("post_processing = ?"); values.push(fields.postProcessing ? 1 : 0); }

  values.push(id);
  db.run(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM projects WHERE id = ?", [id]);
  persistDb(db);
}
