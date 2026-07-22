import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication routes
 * Limits to 5 requests per 15 minutes for password resets and verification resends
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * General rate limiter for login and registration
 * Limits to 10 requests per 15 minutes
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for public password-gate unlock attempts (e.g. /websites/live/:slug/unlock)
 * Limits to 10 attempts per 10 minutes per IP to slow down brute-forcing short passwords
 */
export const gateRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
