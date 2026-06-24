import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { attachSessionCookie, hashPassword, publicClient } from "@/lib/auth";
import { badRequest, jsonCreated, jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.firstName || !body?.lastName || !body?.email || !body?.password) {
    return badRequest("firstName, lastName, email, and password are required");
  }
  if (String(body.password).length < 8) {
    return badRequest("password must be at least 8 characters");
  }

  const email = String(body.email).toLowerCase();
  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing) return jsonError("An account with this email already exists", 409);

  const passwordHash = await hashPassword(String(body.password));
  const client = await prisma.client.create({
    data: {
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      email,
      passwordHash,
    },
  });

  return attachSessionCookie(jsonCreated(publicClient(client)), client.id);
}
