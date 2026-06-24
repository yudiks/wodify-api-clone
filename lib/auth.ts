import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const SESSION_COOKIE = "wodify_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn(
      "SESSION_SECRET is not set — using an insecure development default. Set it before deploying."
    );
    return "dev-secret-change-me";
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function createSessionToken(clientId: number): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${clientId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const [clientIdRaw, expiresAtRaw, signature] = token.split(".");
  if (!clientIdRaw || !expiresAtRaw || !signature) return null;

  const payload = `${clientIdRaw}.${expiresAtRaw}`;
  const expectedSig = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const clientId = Number(clientIdRaw);
  return Number.isInteger(clientId) ? clientId : null;
}

export function attachSessionCookie<T extends NextResponse>(response: T, clientId: number): T {
  response.cookies.set(SESSION_COOKIE, createSessionToken(clientId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}

export function clearSessionCookie<T extends NextResponse>(response: T): T {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export function getSessionClientId(request: NextRequest): number | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function getSessionClient(request: NextRequest) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return null;
  return prisma.client.findUnique({ where: { id: clientId } });
}

export function publicClient<T extends { passwordHash?: string | null }>(client: T): Omit<T, "passwordHash"> {
  const { passwordHash, ...rest } = client;
  return rest;
}
