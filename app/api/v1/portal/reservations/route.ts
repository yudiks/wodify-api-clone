import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionClientId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return jsonError("Not signed in", 401);

  const reservations = await prisma.classReservation.findMany({
    where: { clientId },
    include: { class: true },
    orderBy: { createdDate: "desc" },
  });
  return jsonOk({ data: reservations });
}
