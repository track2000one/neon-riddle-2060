import { ensureAuth } from './auth.js';
import { configureProgress } from './progress-client.js';
import { configureQuestionMastery } from './question-mastery-client.js';

ensureAuth()
  .then(session => {
    configureProgress(session);
    configureQuestionMastery(session);
    return Promise.allSettled([
      window.NEON_PROGRESS?.sync?.(),
      window.NEON_QUESTION_MASTERY?.flush?.()
    ]);
  })
  .catch(error => {
    console.warn('NEON exam progress bootstrap:', error);
  });
