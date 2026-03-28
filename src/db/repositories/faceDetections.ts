import { getDb, persistDb } from "../db";
import { parseJsonOrNull } from "../utils";

export interface FaceDetection {
  id: string;
  clipId: string;
  projectId: string;
  groupId: string | null;
  faceImagePath: string | null;
  frameImagePath: string | null;
  embedding: number[] | null;
  bbox: [number, number, number, number] | null;
  frameTime: number | null;
  qualityScore: number | null;
  detScore: number | null;
  pose: { yaw: number; pitch: number; roll: number } | null;
  frameWidth: number | null;
  frameHeight: number | null;
  createdAt: string;
}

function rowToFace(row: Record<string, unknown>): FaceDetection {
  return {
    id: row.id as string,
    clipId: row.clip_id as string,
    projectId: row.project_id as string,
    groupId: (row.group_id as string | null) ?? null,
    faceImagePath: (row.face_image_path as string | null) ?? null,
    frameImagePath: (row.frame_image_path as string | null) ?? null,
    embedding: parseJsonOrNull<number[]>(row.embedding),
    bbox: parseJsonOrNull<[number, number, number, number]>(row.bbox),
    frameTime: (row.frame_time as number | null) ?? null,
    qualityScore: (row.quality_score as number | null) ?? null,
    detScore: (row.det_score as number | null) ?? null,
    pose: parseJsonOrNull<{ yaw: number; pitch: number; roll: number }>(row.pose),
    frameWidth: (row.frame_width as number | null) ?? null,
    frameHeight: (row.frame_height as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listFaceDetections(clipId?: string, projectId?: string): Promise<FaceDetection[]> {
  const db = await getDb();
  let sql = "SELECT * FROM face_detections";
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (clipId)    { conditions.push("clip_id = ?");    params.push(clipId); }
  if (projectId) { conditions.push("project_id = ?"); params.push(projectId); }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY frame_time ASC";

  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToFace(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function insertFaceDetection(data: Omit<FaceDetection, "id" | "createdAt">): Promise<FaceDetection> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO face_detections
     (id, clip_id, project_id, group_id, face_image_path, frame_image_path, embedding, bbox, frame_time, quality_score, det_score, pose, frame_width, frame_height, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.clipId, data.projectId, data.groupId ?? null,
     data.faceImagePath ?? null, data.frameImagePath ?? null,
     data.embedding ? JSON.stringify(data.embedding) : null,
     data.bbox ? JSON.stringify(data.bbox) : null,
     data.frameTime ?? null, data.qualityScore ?? null, data.detScore ?? null,
     data.pose ? JSON.stringify(data.pose) : null,
     data.frameWidth ?? null, data.frameHeight ?? null, now]
  );
  persistDb(db);
  return { ...data, id, createdAt: now };
}

export async function updateFaceDetectionGroup(id: string, groupId: string | null): Promise<void> {
  const db = await getDb();
  db.run("UPDATE face_detections SET group_id = ? WHERE id = ?", [groupId, id]);
  persistDb(db);
}

export async function deleteFaceDetection(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM face_detections WHERE id = ?", [id]);
  persistDb(db);
}
