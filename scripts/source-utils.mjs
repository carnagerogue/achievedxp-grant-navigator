import { writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export async function fetchJson(url, init = {}, { fetchImpl = fetch, attempts = 3, wait = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  let failure;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return await response.json();
    } catch (error) {
      failure = error;
      if (error.retryable === false || attempt === attempts - 1) throw error;
      await wait(500 * 2 ** attempt);
    }
  }
  throw failure;
}

export function chooseSourceSnapshot(previous, incoming, errors, { previousAt = null, now = new Date().toISOString() } = {}) {
  const failed = errors.length > 0;
  const retained = failed && Array.isArray(previous) && previous.length > 0;
  return {
    records: retained ? previous : incoming,
    health: { state: retained ? 'stale' : failed ? 'partial' : 'current', last_attempt_at: now, last_success_at: failed ? previousAt : now, retained_previous: retained, error_count: errors.length }
  };
}

export async function writeAtomicJson(path, payload) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(payload, null, 2) + '\n', 'utf8'); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}
