import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, jsonOk, notFound, parseId } from "@/lib/http";

type RankedEntry = {
  clientId: number;
  clientName: string;
  bestScore: number;
  performedAt: Date;
  rank: number;
};

function rankResults(
  results: { clientId: number; client: { firstName: string; lastName: string }; score: number; performedAt: Date }[],
  sortDirection: string
): RankedEntry[] {
  const bestByClient = new Map<number, { clientName: string; bestScore: number; performedAt: Date }>();

  for (const r of results) {
    const existing = bestByClient.get(r.clientId);
    const isBetter =
      !existing ||
      (sortDirection === "asc" ? r.score < existing.bestScore : r.score > existing.bestScore) ||
      (r.score === existing.bestScore && r.performedAt < existing.performedAt);
    if (isBetter) {
      bestByClient.set(r.clientId, {
        clientName: `${r.client.firstName} ${r.client.lastName}`,
        bestScore: r.score,
        performedAt: r.performedAt,
      });
    }
  }

  const entries = Array.from(bestByClient.entries()).map(([clientId, v]) => ({ clientId, ...v }));
  entries.sort((a, b) => {
    if (a.bestScore !== b.bestScore) {
      return sortDirection === "asc" ? a.bestScore - b.bestScore : b.bestScore - a.bestScore;
    }
    return a.performedAt.getTime() - b.performedAt.getTime();
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const workoutId = parseId(rawId);
  if (workoutId === null) return badRequest("Invalid workout id");

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      sections: {
        include: {
          exercises: {
            where: { scored: true },
            include: {
              results: {
                where: { score: { not: null } },
                include: { client: { select: { firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!workout) return notFound("Workout", rawId);

  const scoredExercises = workout.sections
    .flatMap((s) => s.exercises)
    .filter((e) => e.results.length > 0);

  const totalsByClient = new Map<number, { clientName: string; total: number }>();

  const exerciseBreakdown = scoredExercises.map((exercise) => {
    const ranked = rankResults(
      exercise.results.map((r) => ({
        clientId: r.clientId,
        client: r.client,
        score: r.score as number,
        performedAt: r.performedAt,
      })),
      exercise.sortDirection
    );

    for (const entry of ranked) {
      const existing = totalsByClient.get(entry.clientId);
      if (existing) {
        existing.total += entry.rank;
      } else {
        totalsByClient.set(entry.clientId, { clientName: entry.clientName, total: entry.rank });
      }
    }

    return {
      workoutExerciseId: String(exercise.id),
      exerciseName: exercise.name,
      unit: exercise.unit,
      sortDirection: exercise.sortDirection,
      leaderboard: ranked.map((e) => ({ rank: e.rank, clientName: e.clientName, bestScore: e.bestScore })),
    };
  });

  const combined = Array.from(totalsByClient.entries())
    .map(([, v]) => v)
    .sort((a, b) => a.total - b.total)
    .map((v, i) => ({ rank: i + 1, clientName: v.clientName, totalPoints: v.total }));

  return jsonOk({
    workoutId: String(workout.id),
    workoutName: workout.name,
    combinedLeaderboard: combined,
    exerciseBreakdown,
  });
}
