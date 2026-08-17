import assert from 'node:assert/strict';
import { claimLocalStateOwner, canMigrateLegacyProfile, LOCAL_STATE_OWNER_KEY, SHARED_LEGACY_STATE_KEYS } from '../app/src/account-local-state.js';

class MemoryStorage {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

const first = new MemoryStorage({
  neonErrorNotebookV1: '[{"id":"legacy-q1"}]',
  neonOptimizedExamHistoryV1: '[{"score":80}]',
  'neonStudentStateQueueV1:user-a': '[{"type":"plan"}]'
});

const firstClaim = claimLocalStateOwner(first, 'user-a');
assert.equal(firstClaim.firstClaim, true);
assert.equal(first.getItem('neonErrorNotebookV1'), '[{"id":"legacy-q1"}]', 'first authenticated account should retain legacy cache for migration');
assert.equal(first.getItem(LOCAL_STATE_OWNER_KEY), 'user-a');

const sameClaim = claimLocalStateOwner(first, 'user-a');
assert.equal(sameClaim.changed, false);
assert.equal(first.getItem('neonOptimizedExamHistoryV1'), '[{"score":80}]');

const switched = claimLocalStateOwner(first, 'user-b');
assert.equal(switched.changed, true);
assert.equal(switched.previousOwner, 'user-a');
for (const key of SHARED_LEGACY_STATE_KEYS) {
  assert.equal(first.getItem(key), null, `${key} must be cleared when the Firebase UID changes`);
}
assert.equal(first.getItem('neonStudentStateQueueV1:user-a'), '[{"type":"plan"}]', 'UID-scoped queues must not be destroyed by an account switch');
assert.equal(first.getItem(LOCAL_STATE_OWNER_KEY), 'user-b');

assert.equal(canMigrateLegacyProfile({ id: 'legacy-player', score: 10 }), true, 'unbound legacy profile may migrate once');
assert.equal(canMigrateLegacyProfile({ id: 'user-a', firebaseUid: 'user-a', score: 10 }), false, 'Firebase-bound profile must never be cloned into another account');
assert.equal(canMigrateLegacyProfile(null), false);

console.log('Cross-account browser state isolation validated successfully.');
