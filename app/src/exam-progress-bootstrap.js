import { ensureAuth } from './auth.js';
import { configureProgress } from './progress-client.js';

ensureAuth()
  .then(session => {
    configureProgress(session);
    return window.NEON_PROGRESS?.sync?.();
  })
  .catch(error => {
    console.warn('NEON exam progress bootstrap:', error);
  });
