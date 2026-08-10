export const LOCAL_STATE_OWNER_KEY = 'neonLocalStateOwnerV1';

export const SHARED_LEGACY_STATE_KEYS = Object.freeze([
  'neonErrorNotebookV1',
  'neonLearningProgressV1',
  'neonLearningLastLessonV1',
  'neonGamesProgressV1',
  'neonOptimizedExamHistoryV1'
]);

export function claimLocalStateOwner(storage, uid) {
  const nextOwner = String(uid || '').trim();
  if (!storage || !nextOwner) return { owner: '', previousOwner: '', changed: false, cleared: [] };

  const previousOwner = String(storage.getItem(LOCAL_STATE_OWNER_KEY) || '').trim();
  if (!previousOwner) {
    storage.setItem(LOCAL_STATE_OWNER_KEY, nextOwner);
    return { owner: nextOwner, previousOwner: '', changed: false, firstClaim: true, cleared: [] };
  }
  if (previousOwner === nextOwner) {
    return { owner: nextOwner, previousOwner, changed: false, firstClaim: false, cleared: [] };
  }

  const cleared = [];
  for (const key of SHARED_LEGACY_STATE_KEYS) {
    if (storage.getItem(key) !== null) cleared.push(key);
    storage.removeItem(key);
  }
  storage.setItem(LOCAL_STATE_OWNER_KEY, nextOwner);
  return { owner: nextOwner, previousOwner, changed: true, firstClaim: false, cleared };
}

export function canMigrateLegacyProfile(profile) {
  return Boolean(profile && typeof profile === 'object' && !String(profile.firebaseUid || '').trim());
}
