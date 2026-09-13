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
  currentRank?: string;
}

/**
 * Checks current auth status: whether an account exists and whether user is authenticated
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
        currentRank: user.currentRank,
      };
    }
  }

  // Check if any user exists in database
  const firstUser = await dataService.getFirstUser();
  return {
    hasAccount: Boolean(firstUser),
    isAuthenticated: false,
  };
}

/**
 * Creates initial user account with PIN
 */
export async function setupPinAction(pin: string): Promise<{ success: boolean; error?: string }> {
  const parseResult = pinSchema.safeParse(pin);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0]?.message || 'Invalid PIN' };
  }

  try {
    const existingUser = await dataService.getFirstUser();
    if (existingUser) {
      return { success: false, error: 'An account already exists. Please log in.' };
    }

    const pinHash = await hashPin(pin);
    const newUser = await dataService.createUserWithPin(pinHash);
    await createUserSession(newUser.id);
    return { success: true };
  } catch (error) {
    console.error('Setup PIN error:', error);
    return { success: false, error: 'Failed to create PIN. Please try again.' };
  }
}

/**
 * Logs in with user PIN with brute-force lockout protection
 */
export async function loginWithPinAction(
  pin: string
): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> {
  const parseResult = pinSchema.safeParse(pin);
  if (!parseResult.success) {
    return { success: false, error: 'Invalid PIN' };
  }

  const user = await dataService.getFirstUser();
  if (!user) {
    return { success: false, error: 'No account found. Please create one.' };
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
      error: 'Invalid PIN',
      remainingAttempts: failedStatus.remainingAttempts,
    };
  }

  // Successful verification
  resetAttempts(user.id);
  await createUserSession(user.id);
  return { success: true };
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
