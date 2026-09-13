'use server';

import { pinSchema } from '@/lib/validation';
import { hashPin, verifyPin } from '@/lib/auth/pin';
import {
  createUserSession,
  getUserSession,
  destroyUserSession,
} from '@/lib/auth/session';
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/security/rate-limiter';
import { dataService } from '@/services/dataService';

export interface AuthStateResponse {
  hasAccount: boolean;
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  currentRank?: string;
}

/**
 * Checks current auth status: whether user has an active session
 */
export async function checkAuthState(): Promise<AuthStateResponse> {
  const session = await getUserSession();
  if (session) {
    const user = await dataService.getUserById(session.userId);
    if (user) {
      return {
        hasAccount: true,
        isAuthenticated: true,
        userId: user.id,
        username: user.username,
        currentRank: user.currentRank,
      };
    }
  }

  return {
    hasAccount: true,
    isAuthenticated: false,
  };
}

/**
 * Registers a new user account with unique username and PIN
 */
export async function registerUserAction(
  username: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  const cleanUsername = (username || '').trim();
  if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20) {
    return { success: false, error: 'Username must be between 3 and 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }

  const parseResult = pinSchema.safeParse(pin);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0]?.message || 'Invalid PIN' };
  }

  try {
    const existingUser = await dataService.getUserByUsername(cleanUsername);
    if (existingUser) {
      return { success: false, error: 'Username is already taken. Please choose another.' };
    }

    const pinHash = await hashPin(pin);
    const newUser = await dataService.createUserWithPin(cleanUsername, pinHash);
    await createUserSession(newUser.id);
    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to create account. Please try again.' };
  }
}

/**
 * Logs in with username and PIN with brute-force lockout protection
 */
export async function loginUserAction(
  username: string,
  pin: string
): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> {
  const cleanUsername = (username || '').trim();
  if (!cleanUsername) {
    return { success: false, error: 'Please enter your username.' };
  }

  const parseResult = pinSchema.safeParse(pin);
  if (!parseResult.success) {
    return { success: false, error: 'PIN must be 4 to 8 digits.' };
  }

  const user = await dataService.getUserByUsername(cleanUsername);
  if (!user) {
    return { success: false, error: 'No account found with that username.' };
  }

  // Rate limiter check by user id
  const rateLimit = checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many failed attempts. Try again in ${rateLimit.retryAfterMinutes || 15} minutes.`,
    };
  }

  const isValid = await verifyPin(pin, user.pinHash);
  if (!isValid) {
    const failedStatus = recordFailedAttempt(user.id);
    if (!failedStatus.allowed) {
      return {
        success: false,
        error: `Account locked for ${failedStatus.retryAfterMinutes || 15} minutes due to repeated failed attempts.`,
      };
    }
    return {
      success: false,
      error: 'Invalid PIN for this user.',
      remainingAttempts: failedStatus.remainingAttempts,
    };
  }

  // Successful verification
  resetAttempts(user.id);
  await createUserSession(user.id);
  return { success: true };
}

/**
 * Legacy aliases for backwards compatibility
 */
export async function setupPinAction(pin: string): Promise<{ success: boolean; error?: string }> {
  return registerUserAction('user_' + Math.floor(Math.random() * 100000), pin);
}

export async function loginWithPinAction(
  pin: string
): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> {
  const firstUser = await dataService.getFirstUser();
  if (!firstUser) {
    return { success: false, error: 'No account found. Please register.' };
  }
  return loginUserAction(firstUser.username, pin);
}

/**
 * Logs out user by clearing session cookie
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  await destroyUserSession();
  return { success: true };
}

/**
 * Changes user PIN after verifying current PIN
 */
export async function changePinAction(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const parseNew = pinSchema.safeParse(newPin);
  if (!parseNew.success) {
    return { success: false, error: parseNew.error.errors[0]?.message || 'Invalid new PIN format' };
  }

  const user = await dataService.getUserById(session.userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const isCurrentValid = await verifyPin(currentPin, user.pinHash);
  if (!isCurrentValid) {
    return { success: false, error: 'Incorrect current PIN' };
  }

  const newHash = await hashPin(newPin);
  await dataService.updateUserPin(session.userId, newHash);
  return { success: true };
}
