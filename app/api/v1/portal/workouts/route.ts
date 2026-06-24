import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/http";

function dayBounds(dateParam: string | null): { from: Date; to: Date } {
  const from = dateParam ? new Date(dateParam) : new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const program = searchParams.get("program");
  const { from, to } = dayBounds(searchParams.get("date"));

  const [workouts, programRows] = await Promise.all([
    prisma.workout.findMany({
      where: {
        scheduledDate: { gte: from, lt: to },
        ...(program ? { program } : {}),
      },
      orderBy: { id: "asc" },
      include: {
        sections: {
          orderBy: { position: "asc" },
          include: { exercises: { orderBy: { position: "asc" } } },
        },
      },
    }),
    prisma.workout.findMany({
      where: { program: { not: null } },
      distinct: ["program"],
      select: { program: true },
    }),
  ]);

  return jsonOk({
    data: workouts,
    programs: programRows.map((p) => p.program).filter((p): p is string => Boolean(p)),
  });
}
