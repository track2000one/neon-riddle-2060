(() => {
  'use strict';

  const MEASUREMENT_ID = 'G-NZNC6929YS';
  const APP_NAME = 'neon_riddle_2060';
  const MAX_TEXT_LENGTH = 100;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: true,
    page_title: document.title,
    page_location: window.location.href,
    transport_type: 'beacon'
  });

  let currentMode = '';
  let currentLevel = '';
  let completionSignature = '';

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem('neonRiddleGrandSettingsV4')) || {};
    } catch {
      return {};
    }
  }

  function cleanValue(value) {
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    return String(value ?? '').slice(0, MAX_TEXT_LENGTH);
  }

  function track(eventName, parameters = {}) {
    if (typeof window.gtag !== 'function') return;

    const settings = readSettings();
    const safeParameters = {
      app_name: APP_NAME,
      audience: cleanValue(settings.audience || 'unknown'),
      timer_setting: cleanValue(settings.timer || 'unknown')
    };

    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        safeParameters[key] = cleanValue(value);
      }
    });

    window.gtag('event', eventName, safeParameters);
  }

  window.neonAnalytics = { track };

  function inferModeFromPage() {
    const text = document.querySelector('.section-kicker')?.textContent || '';
    const map = [
      ['القدرات اللفظية', 'qudurat_verbal'],
      ['القدرات الكمية', 'qudurat_quant'],
      ['المعرفة', 'knowledge'],
      ['مكتبة الكتاب', 'book'],
      ['المنطق', 'logic'],
      ['التفكير الجانبي', 'lateral'],
      ['الحساب', 'math'],
      ['الكلمات المتقطعة', 'scramble'],
      ['الذكاء البصري', 'visual'],
      ['الصور الخفية', 'hidden'],
      ['شبكات الكلمات', 'cross']
    ];
    return map.find(([label]) => text.includes(label))?.[1] || currentMode || 'unknown';
  }

  document.addEventListener('click', event => {
    const element = event.target.closest('[data-action]');
    if (!element) return;

    const action = element.dataset.action;
    const mode = element.dataset.mode || currentMode;
    const level = element.dataset.level || currentLevel;

    switch (action) {
      case 'home':
        track('screen_viewed', { screen_name: 'home' });
        break;
      case 'profiles':
        track('profiles_opened');
        break;
      case 'select-profile':
        track('profile_selected');
        break;
      case 'set-audience':
        track('audience_changed', { selected_audience: element.dataset.value });
        break;
      case 'set-timer':
        track('timer_changed', { selected_timer: element.dataset.value });
        break;
      case 'open-mode':
        currentMode = element.dataset.mode || '';
        track('mode_opened', { mode: currentMode });
        break;
      case 'start-level':
        currentMode = element.dataset.mode || currentMode;
        currentLevel = element.dataset.level || '';
        track('game_started', { mode: currentMode, level_number: Number(currentLevel) + 1 });
        break;
      case 'quick-start':
        currentMode = '';
        currentLevel = '';
        track('quick_start_used');
        break;
      case 'library':
        track('library_opened');
        break;
      case 'library-filter':
        track('library_filtered', { filter_name: element.dataset.value });
        break;
      case 'answer':
        track('answer_selected', { mode: inferModeFromPage(), answer_index: Number(element.dataset.index) + 1 });
        break;
      case 'use-hint':
        track('hint_used', { mode: inferModeFromPage() });
        break;
      case 'freeze-time':
        track('time_freeze_used', { mode: inferModeFromPage() });
        break;
      case 'skip-level':
        track('level_skipped', { mode: inferModeFromPage() });
        break;
      case 'reveal-tile':
        track('image_tile_revealed', { mode: 'hidden' });
        break;
      case 'shop':
        track('shop_opened');
        break;
      case 'buy-theme':
      case 'buy-avatar':
      case 'buy-booster':
        track('shop_item_selected', { item_type: action.replace('buy-', ''), item_id: element.dataset.id });
        break;
      case 'claim-daily':
        track('daily_reward_claimed');
        break;
      case 'claim-achievement':
        track('achievement_claimed', { achievement_id: element.dataset.id });
        break;
      case 'aptitude':
        track('qudurat_hub_opened');
        break;
      case 'start-aptitude':
        track('qudurat_exam_started');
        break;
      case 'tournament':
        track('tournament_opened');
        break;
      case 'start-tournament':
        track('tournament_started');
        break;
      default:
        break;
    }
  }, { passive: true });

  const profileForm = document.getElementById('profileForm');
  profileForm?.addEventListener('submit', () => {
    track('profile_create_submitted');
  });

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        const resultOverlay = node.matches('.result-overlay') ? node : node.querySelector('.result-overlay');
        if (resultOverlay) {
          const resultText = resultOverlay.textContent || '';
          const signature = `${inferModeFromPage()}|${currentLevel}|${resultText.slice(0, 80)}`;
          if (signature !== completionSignature) {
            completionSignature = signature;
            const stars = (resultText.match(/★/g) || []).length;
            track('level_completed', {
              mode: inferModeFromPage(),
              level_number: currentLevel === '' ? 'unknown' : Number(currentLevel) + 1,
              stars
            });
          }
        }

        const aptitudeResult = node.matches('.aptitude-result, .simulation-result')
          ? node
          : node.querySelector('.aptitude-result, .simulation-result');
        if (aptitudeResult) {
          const percentMatch = (aptitudeResult.textContent || '').match(/(\d{1,3})\s*%/);
          track('qudurat_exam_completed', {
            training_score: percentMatch ? Number(percentMatch[1]) : 'unknown'
          });
        }

        const tournamentResult = node.matches('.tournament-result')
          ? node
          : node.querySelector('.tournament-result');
        if (tournamentResult) {
          const scoreMatch = (tournamentResult.textContent || '').match(/([\d٬,]+)\s*نقطة/);
          track('tournament_completed', {
            tournament_score: scoreMatch ? scoreMatch[1].replace(/[٬,]/g, '') : 'unknown'
          });
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  track('app_loaded', {
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    standalone_mode: window.matchMedia?.('(display-mode: standalone)').matches || false
  });
})();
