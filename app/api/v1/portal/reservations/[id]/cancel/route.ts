import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionClientId } from "@/lib/auth";
import { badRequest, jsonError, jsonOk, notFound, parseId } from "@/lib/http";

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return jsonError("Not signed in", 401);

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) return badRequest("Invalid reservation id");

  const reservation = await prisma.classReservation.findUnique({ where: { id } });
  if (!reservation) return notFound("Reservation", rawId);
  if (reservation.clientId !== clientId) return jsonError("Not your reservation", 403);

  const updated = await prisma.classReservation.update({ where: { id }, data: { status: "Cancelled" } });
  return jsonOk(updated);
}
