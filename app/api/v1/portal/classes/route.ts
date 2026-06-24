import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const classes = await prisma.class.findMany({
    where: { startDateTime: { gte: new Date() } },
    orderBy: { startDateTime: "asc" },
    include: { _count: { select: { reservations: { where: { status: "Reserved" } } } } },
  });

  const data = classes.map(({ _count, ...klass }) => ({
    ...klass,
    spotsRemaining: Math.max(0, klass.capacity - _count.reservations),
  }));

  return jsonOk({ data });
}
