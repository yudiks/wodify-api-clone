import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const now = new Date();
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : now;
  const to = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const classes = await prisma.class.findMany({
    where: { startDateTime: { gte: from, lte: to } },
    orderBy: { startDateTime: "asc" },
    include: { _count: { select: { reservations: { where: { status: "Reserved" } } } } },
  });

  const data = classes.map(({ _count, ...klass }) => ({
    ...klass,
    spotsRemaining: Math.max(0, klass.capacity - _count.reservations),
  }));

  return jsonOk({ data });
}
