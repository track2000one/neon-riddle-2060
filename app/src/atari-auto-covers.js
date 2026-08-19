import './atari-auto-covers.css';
import { ensureAuth } from './auth.js';

const coverCache = new Map();
const pending = new Set();
let authSession = null;
let enabled = false;
let observer = null;
let gridObserver = null;

async function getSession() {
  if (window.NEON_AUTH_SESSION?.user) return window.NEON_AUTH_SESSION;
  return ensureAuth();
}

async function authHeaders() {
  if (!authSession?.user) throw new Error('AUTH_SESSION_MISSING');
  const token = await authSession.user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function apiJson(path) {
  const response = await fetch(path, {
    cache: 'no-store',
    headers: await authHeaders()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || `HTTP_${response.status}`), {
    status: response.status,
    code: data.error || 'ATARI_METADATA_REQUEST_FAILED'
  });
  return data;
}

function validCoverUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function installCover(card, result) {
  const cover = card.querySelector('.atari-cover');
  if (!cover) return;
  const url = validCoverUrl(result?.coverUrl);
  if (!url) {
    cover.dataset.coverState = 'missing';
    cover.classList.remove('is-auto-cover-loading');
    return;
  }

  let image = cover.querySelector('img.atari-auto-cover');
  if (!image) {
    image = document.createElement('img');
    image.className = 'atari-auto-cover';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = result?.title ? `غلاف ${result.title}` : 'غلاف لعبة Atari 2600';
    cover.append(image);
  }

  image.addEventListener('load', () => {
    cover.classList.remove('is-auto-cover-loading');
    cover.classList.add('has-auto-cover');
    cover.dataset.coverState = 'loaded';
  }, { once: true });
  image.addEventListener('error', () => {
    image.remove();
    cover.classList.remove('is-auto-cover-loading');
    cover.dataset.coverState = 'error';
  }, { once: true });
  image.src = url;

  if (result?.matchMethod === 'hash') card.dataset.coverMatch = 'hash';
  else if (result?.matched) card.dataset.coverMatch = 'name';
}

async function loadCardCover(card) {
  if (!enabled || !card?.isConnected) return;
  const fileId = String(card.dataset.driveId || '').trim();
  if (!fileId || pending.has(fileId)) return;
  const cover = card.querySelector('.atari-cover');
  if (!cover || cover.dataset.coverState === 'loaded' || cover.dataset.coverState === 'missing') return;

  if (coverCache.has(fileId)) {
    installCover(card, coverCache.get(fileId));
    return;
  }

  pending.add(fileId);
  cover.classList.add('is-auto-cover-loading');
  cover.dataset.coverState = 'loading';
  try {
    const result = await apiJson(`/api/atari-metadata/cover/${encodeURIComponent(fileId)}`);
    coverCache.set(fileId, result);
    installCover(card, result);
  } catch (error) {
    cover.classList.remove('is-auto-cover-loading');
    cover.dataset.coverState = error?.status === 429 ? 'rate-limited' : 'error';
    if (error?.status === 429) {
      enabled = false;
      observer?.disconnect();
      console.warn('Atari cover lookup paused because TheGamesDB allowance is temporarily unavailable.');
    }
  } finally {
    pending.delete(fileId);
  }
}

function observeCard(card) {
  if (!enabled || !card?.matches?.('.drive-card[data-drive-id]')) return;
  const cover = card.querySelector('.atari-cover');
  if (!cover || cover.dataset.coverObserved === '1') return;
  cover.dataset.coverObserved = '1';
  observer.observe(cover);
}

function scanCards(root = document) {
  root.querySelectorAll?.('.drive-card[data-drive-id]').forEach(observeCard);
}

function startObservers() {
  const grid = document.getElementById('driveLibraryGrid');
  if (!grid || observer) return;

  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const card = entry.target.closest('.drive-card[data-drive-id]');
      if (card) loadCardCover(card);
    });
  }, { rootMargin: '360px 0px', threshold: 0.01 });

  gridObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches('.drive-card[data-drive-id]')) observeCard(node);
      scanCards(node);
    }));
  });
  gridObserver.observe(grid, { childList: true, subtree: true });
  scanCards(grid);
}

async function bootstrap() {
  try {
    authSession = await getSession();
    const status = await apiJson('/api/atari-metadata/status');
    enabled = Boolean(status.configured && status.driveConfigured);
    if (!enabled) return;
    startObservers();
  } catch (error) {
    if (!String(error?.message || '').includes('Authentication required')) {
      console.warn('Atari automatic covers unavailable:', error?.message || error);
    }
  }
}

bootstrap();

window.addEventListener('beforeunload', () => {
  observer?.disconnect();
  gridObserver?.disconnect();
});
