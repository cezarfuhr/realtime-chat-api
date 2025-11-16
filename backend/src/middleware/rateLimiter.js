const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests, please try again later.'
    });
  }
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts, please try again in 15 minutes.'
    });
  }
});

// Message sending limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: 'You are sending messages too quickly. Please slow down.',
  keyGenerator: (req) => {
    // Use user ID instead of IP for authenticated users
    return req.userId ? req.userId.toString() : req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Message rate limit exceeded for user: ${req.userId || req.ip}`);
    res.status(429).json({
      error: 'You are sending messages too quickly. Please wait a moment.'
    });
  }
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many file uploads, please try again later.',
  keyGenerator: (req) => {
    return req.userId ? req.userId.toString() : req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for user: ${req.userId || req.ip}`);
    res.status(429).json({
      error: 'You have exceeded the file upload limit. Please try again later.'
    });
  }
});

// Create room limiter
const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 rooms per hour
  message: 'Too many rooms created, please try again later.',
  keyGenerator: (req) => {
    return req.userId ? req.userId.toString() : req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Create room rate limit exceeded for user: ${req.userId || req.ip}`);
    res.status(429).json({
      error: 'You have created too many rooms. Please try again later.'
    });
  }
});

// Initialize Redis store for rate limiting (optional, for production)
const createRedisStore = () => {
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      return new RedisStore({
        // @ts-expect-error - Known issue with TypeScript types
        client: redisClient,
        prefix: 'rl:',
      });
    }
  } catch (error) {
    logger.error('Failed to create Redis store for rate limiting:', error);
  }
  return undefined;
};

// Export limiters
module.exports = {
  apiLimiter,
  authLimiter,
  messageLimiter,
  uploadLimiter,
  createRoomLimiter,
  createRedisStore
};
