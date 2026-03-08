// Simple in-memory likes store
// Note: This persists only for the lifetime of the API process

const likesStore: Map<string, number> = new Map();

export function getLikesCount(blogId: string | number) {
  const key = String(blogId);
  return likesStore.get(key) ?? 0;
}

export function addLike(blogId: string | number) {
  const key = String(blogId);
  const current = likesStore.get(key) ?? 0;
  const next = current + 1;
  likesStore.set(key, next);
  return next;
}

export function removeLike(blogId: string | number) {
  const key = String(blogId);
  const current = likesStore.get(key) ?? 0;
  const next = Math.max(0, current - 1);
  likesStore.set(key, next);
  return next;
}
