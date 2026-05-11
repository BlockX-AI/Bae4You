import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/auth/nonce': { requests: 5, window: 60 },
  '/auth/siwe': { requests: 10, window: 60 },
  '/matches/discover': { requests: 100, window: 60 },
  '/actions/tx-data': { requests: 50, window: 60 },
  '/users/me/push-token': { requests: 5, window: 3600 },
  'default': { requests: 1000, window: 3600 },
};

function getRateLimitKey(identifier: string, path: string): string {
  // Use full path (sanitised) so /auth/nonce and /auth/siwe have separate counters
  const normalizedPath = path.replace(/[^a-z0-9/_-]/gi, "_").slice(0, 80) || "default";
  return `rate_limit:${normalizedPath}:${identifier}`;
}

function getRateLimitConfig(path: string): RateLimitConfig {
  // Check for exact matches first
  if (RATE_LIMITS[path]) {
    return RATE_LIMITS[path];
  }
  
  // Check for prefix matches
  for (const [key, config] of Object.entries(RATE_LIMITS)) {
    if (key !== 'default' && path.startsWith(key)) {
      return config;
    }
  }
  
  return RATE_LIMITS.default;
}

function getClientIdentifier(req: FastifyRequest): string {
  const userId = (req as any).user?.userId;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.ip;
  return `ip:${ip}`;
}

export async function rateLimiter(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const redis = (req.server as any).redis;
    if (!redis) {
      // Redis not available, skip rate limiting
      return;
    }

    const identifier = getClientIdentifier(req);
    const routeUrl = req.routeOptions.url || '/';
    const config = getRateLimitConfig(routeUrl);
    const key = getRateLimitKey(identifier, routeUrl);
    
    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;
    
    // Check if limit exceeded
    if (count >= config.requests) {
      const ttl = await redis.ttl(key);
      reply.header('X-RateLimit-Limit', config.requests);
      reply.header('X-RateLimit-Remaining', 0);
      reply.header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
      reply.header('Retry-After', ttl);
      
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${ttl} seconds.`,
        retryAfter: ttl,
      });
    }
    
    // Increment counter
    const newCount = await redis.incr(key);
    
    // Set expiration if this is the first request
    if (newCount === 1) {
      await redis.expire(key, config.window);
    }
    
    // Set headers
    const ttl = await redis.ttl(key);
    reply.header('X-RateLimit-Limit', config.requests);
    reply.header('X-RateLimit-Remaining', Math.max(0, config.requests - newCount));
    reply.header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
    
  } catch (error) {
    // If Redis fails, allow the request but log the error
    console.error('Rate limiter error:', error);
    // Don't block requests if Redis is down
  }
}

// Admin bypass function — decode (not verify) the Bearer JWT so we can check role
// even though this middleware runs before fastify.authenticate.
// Access control is still enforced by fastify.requireAdmin; this only affects throttling.
export function adminBypass(req: FastifyRequest): boolean {
  // First try already-decoded user (in case authenticate ran before us)
  if ((req as any).user?.role === "admin") return true;
  try {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) return false;
    const payloadB64 = auth.split(".")[1];
    if (!payloadB64) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

// Rate limiter middleware with admin bypass
export async function rateLimiterWithAdminBypass(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (adminBypass(req)) {
    // Skip rate limiting for admins
    reply.header('X-RateLimit-Bypass', 'admin');
    return;
  }
  
  return rateLimiter(req, reply);
}
