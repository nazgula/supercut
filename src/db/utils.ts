/** Safe JSON.parse — returns null instead of throwing on malformed input. */
export function parseJsonOrNull<T>(value: unknown): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return null;
  }
}
