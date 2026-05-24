import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
const cookieName = process.env.SESSION_COOKIE ?? "agent_session";
const maxAge = Number(process.env.SESSION_MAX_AGE ?? 604800);

export async function createSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret);

  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSession(): Promise<{ role: string } | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { role: string };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  return session !== null;
}
