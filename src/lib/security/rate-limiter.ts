interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

// In-memory rate limiting store for PIN attempts
const attemptsMap = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMinutes?: number;
}

/**
 * Checks whether an identifier (e.g. IP or user ID) is currently locked out
 */
export function checkRateLimit(identifier: string): RateLimitStatus {
  const now = Date.now();
  const record = attemptsMap.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if locked
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const retryAfterMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return { allowed: false, remainingAttempts: 0, retryAfterMinutes };
    } else {
      // Lock has expired, reset
      attemptsMap.delete(identifier);
      return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }
  }

  // Check if attempt window expired
  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    attemptsMap.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.count);
  return { allowed: remainingAttempts > 0, remainingAttempts };
}

/**
 * Records a failed PIN attempt and locks out if max attempts exceeded
 */
export function recordFailedAttempt(identifier: string): RateLimitStatus {
  const now = Date.now();
  const record = attemptsMap.get(identifier);

  if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    attemptsMap.set(identifier, {
      count: 1,
      firstAttemptAt: now,
    });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  const newCount = record.count + 1;
  if (newCount >= MAX_ATTEMPTS) {
    record.count = newCount;
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    const retryAfterMinutes = Math.ceil(LOCKOUT_DURATION_MS / 60000);
    return { allowed: false, remainingAttempts: 0, retryAfterMinutes };
  }

  record.count = newCount;
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - newCount };
}

/**
 * Resets failed attempts after a successful login
 */
export function resetAttempts(identifier: string): void {
  attemptsMap.delete(identifier);
}
