/**
 * Get CORS headers based on environment configuration
 */
export function getCorsHeaders(origin?: string | null): HeadersInit {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
  
  // Default to restrictive CORS in production
  let allowOrigin = '';
  
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    // Allow all origins (not recommended for production)
    allowOrigin = '*';
  } else if (origin && allowedOrigins.includes(origin)) {
    // Allow specific origin if it's in the allowed list
    allowOrigin = origin;
  } else if (allowedOrigins.length > 0) {
    // Default to first allowed origin if current origin not in list
    allowOrigin = allowedOrigins[0];
  }
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };
}