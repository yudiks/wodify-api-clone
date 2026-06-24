import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionClientId } from "@/lib/auth";
import { badRequest, jsonCreated, jsonError, jsonOk, notFound, parseId } from "@/lib/http";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return jsonError("Not signed in", 401);

  const { id: rawId } = await ctx.params;
  const exerciseId = parseId(rawId);
  if (exerciseId === null) return badRequest("Invalid exercise id");

  const results = await prisma.workoutResult.findMany({
    where: { exerciseId, clientId },
    orderBy: { performedAt: "desc" },
  });
  return jsonOk({ data: results });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const clientId = getSessionClientId(request);
  if (clientId === null) return jsonError("Not signed in", 401);

  const { id: rawId } = await ctx.params;
  const exerciseId = parseId(rawId);
  if (exerciseId === null) return badRequest("Invalid exercise id");

  const exercise = await prisma.workoutExercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return notFound("WorkoutExercise", rawId);

  const body = await request.json().catch(() => null);
  if (!body?.notes || !String(body.notes).trim()) return badRequest("notes is required");

  let score: number | undefined;
  if (body.score !== undefined && body.score !== null) {
    score = Number(body.score);
    if (!Number.isFinite(score)) return badRequest("score must be a number");
  }

  const result = await prisma.workoutResult.create({
    data: { exerciseId, clientId, notes: String(body.notes).trim(), score },
  });
  return jsonCreated(result);
}
