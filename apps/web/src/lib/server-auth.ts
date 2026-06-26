import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "pagereal_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_COST = 12;
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function isStrongPassword(password: string): boolean {
  // Minimum bar for an MVP: not a full NIST-800-63 implementation, but long
  // enough + not trivially guessable. Revisit before handling real accounts
  // at scale (see agent_docs/security_requirements.md).
  return password.length >= 10 && /[0-9]/.test(password) && /[a-zA-Z]/.test(password);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token to set in the cookie — only its hash is ever stored. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { token: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function getSessionUser(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}

/** Coarse brute-force protection — counts recent failed attempts by email or IP. */
export async function isRateLimited(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      createdAt: { gte: since },
      succeeded: false,
      OR: [{ email }, { ip }],
    },
  });
  return failures >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  succeeded: boolean,
  userId?: string
): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ip, succeeded, userId } });
}
