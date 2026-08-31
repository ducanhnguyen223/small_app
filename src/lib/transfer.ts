import type { Entry } from './types';

const EXPORT_VERSION = '1.0';

export function toExportJSON(entries: Entry[], now: number = Date.now()): string {
  return JSON.stringify(
    { version: EXPORT_VERSION, exportedAt: new Date(now).toISOString(), entries },
    null,
    2,
  );
}

export type ImportResult = { ok: true; entries: Entry[] } | { ok: false; error: string };

export function parseImport(json: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ' };
  }

  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Định dạng file không đúng' };
  }

  const entries = (data as Record<string, unknown>).entries;
  if (!Array.isArray(entries)) {
    return { ok: false, error: 'File thiếu danh sách entries' };
  }

  for (const e of entries) {
    if (
      typeof e !== 'object' ||
      e === null ||
      typeof (e as Record<string, unknown>).id !== 'string' ||
      typeof (e as Record<string, unknown>).title !== 'string' ||
      typeof (e as Record<string, unknown>).category !== 'string'
    ) {
      return { ok: false, error: 'Có entry không đúng định dạng' };
    }
  }

  return { ok: true, entries: entries as Entry[] };
}

export function mergeEntries(existing: Entry[], imported: Entry[]): Entry[] {
  const existingIds = new Set(existing.map((e) => e.id));
  const newOnes = imported.filter((e) => !existingIds.has(e.id));
  return [...existing, ...newOnes];
}
