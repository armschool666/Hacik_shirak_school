import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET env var is required");
  return new TextEncoder().encode(secret);
}

export async function createSession(): Promise<{ token: string; maxAgeSec: number }> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
  return { token, maxAgeSec: Math.floor(SESSION_TTL_MS / 1000) };
}

export async function isSessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function revokeSession(_token: string | undefined): Promise<void> {
  // Stateless JWT — cookie deletion handles revocation
}
