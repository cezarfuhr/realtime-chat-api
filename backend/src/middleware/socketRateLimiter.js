const logger = require('../utils/logger');

class SocketRateLimiter {
  constructor() {
    // Store rate limit data: userId -> { count, resetTime }
    this.messageRateLimits = new Map();
    this.typingRateLimits = new Map();

    // Configuration
    this.config = {
      messages: {
        maxPerMinute: 20,
        windowMs: 60 * 1000
      },
      typing: {
        maxPerMinute: 60,
        windowMs: 60 * 1000
      }
    };

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  checkLimit(userId, type = 'messages') {
    const now = Date.now();
    const limitsMap = type === 'messages' ? this.messageRateLimits : this.typingRateLimits;
    const config = this.config[type];

    let userLimit = limitsMap.get(userId);

    // Initialize or reset if window has passed
    if (!userLimit || now > userLimit.resetTime) {
      userLimit = {
        count: 0,
        resetTime: now + config.windowMs
      };
      limitsMap.set(userId, userLimit);
    }

    // Check if limit exceeded
    if (userLimit.count >= config.maxPerMinute) {
      logger.warn(`Socket rate limit exceeded for user ${userId}, type: ${type}`);
      return {
        allowed: false,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      };
    }

    // Increment counter
    userLimit.count++;

    return {
      allowed: true,
      remaining: config.maxPerMinute - userLimit.count
    };
  }

  cleanup() {
    const now = Date.now();

    // Clean message limits
    for (const [userId, limit] of this.messageRateLimits.entries()) {
      if (now > limit.resetTime + 60000) { // 1 minute grace period
        this.messageRateLimits.delete(userId);
      }
    }

    // Clean typing limits
    for (const [userId, limit] of this.typingRateLimits.entries()) {
      if (now > limit.resetTime + 60000) {
        this.typingRateLimits.delete(userId);
      }
    }

    logger.debug('Socket rate limiter cleanup completed');
  }

  reset(userId, type = 'all') {
    if (type === 'all' || type === 'messages') {
      this.messageRateLimits.delete(userId);
    }
    if (type === 'all' || type === 'typing') {
      this.typingRateLimits.delete(userId);
    }
  }

  getStats(userId) {
    const messageLimit = this.messageRateLimits.get(userId);
    const typingLimit = this.typingRateLimits.get(userId);

    return {
      messages: messageLimit ? {
        count: messageLimit.count,
        resetTime: messageLimit.resetTime,
        remaining: this.config.messages.maxPerMinute - messageLimit.count
      } : null,
      typing: typingLimit ? {
        count: typingLimit.count,
        resetTime: typingLimit.resetTime,
        remaining: this.config.typing.maxPerMinute - typingLimit.count
      } : null
    };
  }
}

module.exports = new SocketRateLimiter();
