// 모듈 레벨 인메모리 캐시 — 페이지 재방문 시 재요청 방지
const store = new Map();

export function getCache(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { store.delete(key); return null; }
  return hit.data;
}

export function setCache(key, data, ttlMs = 60_000) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(...keys) {
  if (keys.length === 0) { store.clear(); return; }
  keys.forEach(k => store.delete(k));
}
