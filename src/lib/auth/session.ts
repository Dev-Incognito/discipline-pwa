import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const USER_SESSION_COOKIE = 'discipline_session';
const ADMIN_SESSION_COOKIE = 'discipline_admin_session';

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'discipline_super_secret_dev_key_change_in_production_32char'
);

export interface UserSessionPayload {
  userId: string;
  role: 'user';
}

export interface AdminSessionPayload {
  role: 'admin';
  authenticatedAt: number;
}

const isSecure = process.env.NODE_ENV === 'production' && process.env.VERCEL === '1';

/**
 * Creates a signed JWT for a user and sets the HTTP-only cookie
 */
export async function createUserSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId, role: 'user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Verifies and returns the user session from the cookie
 */
export async function getUserSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload && payload.userId && payload.role === 'user') {
      return {
        userId: payload.userId as string,
        role: 'user',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Destroys the user session cookie
 */
export async function destroyUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(USER_SESSION_COOKIE);
}

/**
 * Creates an admin session cookie (shorter expiry for security)
 */
export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ role: 'admin', authenticatedAt: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 2 * 60 * 60, // 2 hours
  });
}

/**
 * Verifies if the admin session cookie is valid
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload && payload.role === 'admin') {
      return {
        role: 'admin',
        authenticatedAt: (payload.authenticatedAt as number) || Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Destroys the admin session cookie
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
