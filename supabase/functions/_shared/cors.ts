// Restricted CORS origins - replaces wildcard '*'
// React Native does not send Origin headers for native requests,
// so CORS primarily protects the web build. Auth tokens are the real security boundary.

const ALLOWED_ORIGINS = [
  'http://localhost:8081',    // Expo dev server
  'http://localhost:19006',   // Expo web
  // Add production domain here when deployed
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
