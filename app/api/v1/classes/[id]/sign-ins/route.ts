import { prisma } from "@/lib/db";
import { badRequest, jsonCreated, notFound, parseId } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawClassId } = await ctx.params;
  const classId = parseId(rawClassId);
  if (classId === null) return badRequest("Invalid Class id");

  const body = await request.json().catch(() => null);
  if (!body?.clientId) return badRequest("clientId is required");

  const klass = await prisma.class.findUnique({ where: { id: classId } });
  if (!klass) return notFound("Class", rawClassId);

  const signIn = await prisma.classSignIn.create({
    data: { classId, clientId: Number(body.clientId) },
  });
  return jsonCreated(signIn);
}
