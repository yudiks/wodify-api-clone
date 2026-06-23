import { prisma } from "@/lib/db";
import { jsonCreated, jsonOk, badRequest } from "@/lib/http";

export async function GET() {
  const statuses = await prisma.leadStatus.findMany({ orderBy: { id: "asc" } });
  return jsonOk({ data: statuses });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name) return badRequest("name is required");
  const status = await prisma.leadStatus.create({ data: { name: String(body.name) } });
  return jsonCreated(status);
}
