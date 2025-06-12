import { parse } from 'best-effort-json-parser';
import { jsonrepair } from 'jsonrepair';

export function parseJSON<T>(json: string | null | undefined, fallback: T, fix = false) {
  if (!json) {
    return fallback;
  }
  const raw = json
    .trim()
    .replace(/^```json\s*/, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '');
  try {
    return parse(raw) as T;
  } catch (e) {
    if (fix) {
      return parseJSON(jsonrepair(json), fallback, false);
    }
    return fallback;
  }
}
