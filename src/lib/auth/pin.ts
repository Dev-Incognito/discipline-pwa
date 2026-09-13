import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Validates PIN format: 4 to 8 numeric digits
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

/**
 * Generates a bcrypt hash for the provided PIN
 */
export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) {
    throw new Error('PIN must be between 4 and 8 digits');
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verifies a PIN against a bcrypt hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash) return false;
  return bcrypt.compare(pin, hash);
}
