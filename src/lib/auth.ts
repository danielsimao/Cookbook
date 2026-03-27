import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me"
);

const COOKIE_NAME = "cookbook-auth";

export async function createToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

/**
 * Extract userId from the JWT in the auth cookie.
 * Use in API routes to scope all queries to the authenticated user.
 */
export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) throw new Error("Not authenticated");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload.userId as string;
}

/**
 * Extract full user info (userId + role) from the JWT.
 */
export async function getUserInfo(): Promise<{ userId: string; role: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) throw new Error("Not authenticated");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return { userId: payload.userId as string, role: payload.role as string };
}

export { COOKIE_NAME };
