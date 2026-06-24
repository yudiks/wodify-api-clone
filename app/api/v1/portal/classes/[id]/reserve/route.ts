import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionClientId } from "@/lib/auth";
import { badRequest, jsonCreated, jsonError, notFound, parseId } from "@/lib/http";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return jsonError("Not signed in", 401);

  const { id: rawClassId } = await ctx.params;
  const classId = parseId(rawClassId);
  if (classId === null) return badRequest("Invalid class id");

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { reservations: { where: { status: "Reserved" } } } } },
  });
  if (!klass) return notFound("Class", rawClassId);

  const existing = await prisma.classReservation.findFirst({
    where: { classId, clientId, status: { in: ["Reserved", "Waitlisted"] } },
  });
  if (existing) return jsonError("You already have a reservation for this class", 409);

  const status = klass._count.reservations >= klass.capacity ? "Waitlisted" : "Reserved";
  const reservation = await prisma.classReservation.create({ data: { classId, clientId, status } });
  return jsonCreated(reservation);
}
