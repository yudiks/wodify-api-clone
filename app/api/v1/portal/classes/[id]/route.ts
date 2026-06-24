import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionClientId } from "@/lib/auth";
import { badRequest, jsonError, jsonOk, notFound, parseId } from "@/lib/http";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return jsonError("Not signed in", 401);

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("Invalid class id");

  const klass = await prisma.class.findUnique({
    where: { id },
    include: {
      coach: { select: { id: true, firstName: true, lastName: true } },
      reservations: {
        where: { status: { in: ["Reserved", "Waitlisted"] } },
        orderBy: { createdDate: "asc" },
        include: { client: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  if (!klass) return notFound("Class", rawId);

  const { reservations, ...classFields } = klass;
  const reservedCount = reservations.filter((r) => r.status === "Reserved").length;
  const mine = reservations.find((r) => r.client.id === clientId);

  return jsonOk({
    ...classFields,
    spotsRemaining: Math.max(0, classFields.capacity - reservedCount),
    attendees: reservations.map((r) => ({
      id: r.client.id,
      firstName: r.client.firstName,
      lastName: r.client.lastName,
      status: r.status,
    })),
    myReservation: mine ? { id: mine.id, status: mine.status } : null,
  });
}
