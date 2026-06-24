import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { attachSessionCookie, publicClient, verifyPassword } from "@/lib/auth";
import { badRequest, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) return badRequest("email and password are required");

  const email = String(body.email).toLowerCase();
  const client = await prisma.client.findUnique({ where: { email } });
  if (!client?.passwordHash) return jsonError("Invalid email or password", 401);

  const valid = await verifyPassword(String(body.password), client.passwordHash);
  if (!valid) return jsonError("Invalid email or password", 401);

  return attachSessionCookie(jsonOk(publicClient(client)), client.id);
}
