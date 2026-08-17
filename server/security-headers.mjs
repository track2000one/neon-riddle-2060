export const BASE_SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none'
});

export function applySecurityHeaders(res) {
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!res.hasHeader(name)) res.setHeader(name, value);
  }
}
