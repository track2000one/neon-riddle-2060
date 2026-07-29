import { getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

try {
  const auth = getAuth(getApp());
  auth.languageCode = window.NEON_I18N?.lang || 'ar';
} catch (error) {
  console.warn('Auth language sync skipped:', error);
}
