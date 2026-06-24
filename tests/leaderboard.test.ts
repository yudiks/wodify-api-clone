import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { GET as getLeaderboard } from "@/app/api/v1/portal/workouts/[id]/leaderboard/route";
import { POST as signup } from "@/app/api/v1/portal/signup/route";
import {
  GET as listResults,
  POST as createResult,
} from "@/app/api/v1/portal/workouts/exercises/[id]/results/route";
import { ctx, makeRequest, sessionCookieFrom } from "./helpers";

async function signupAndGetCookie(email: string) {
  const res = await signup(
    makeRequest("/api/v1/portal/signup", {
      method: "POST",
      body: { firstName: "W", lastName: "O", email, password: "password123" },
    })
  );
  return { client: await res.clone().json(), cookie: sessionCookieFrom(res) };
}

async function makeClient(firstName: string, lastName: string) {
  const status = await prisma.clientStatus.upsert({
    where: { name: "Active" },
    update: {},
    create: { name: "Active" },
  });
  return prisma.client.create({ data: { firstName, lastName, statusId: status.id } });
}

async function makeWorkout() {
  return prisma.workout.create({
    data: {
      name: "Strength Day",
      sections: {
        create: [
          {
            title: "Strength",
            position: 0,
            exercises: {
              create: [
                { name: "Clean", position: 0, scored: true, unit: "lb", sortDirection: "desc" },
                { name: "1 Mile Run", position: 1, scored: true, unit: "sec", sortDirection: "asc" },
                { name: "Air Squats", position: 2 },
              ],
            },
          },
        ],
      },
    },
    include: { sections: { include: { exercises: true } } },
  });
}

describe("Portal workout leaderboard", () => {
  it("404s for a missing workout", async () => {
    const res = await getLeaderboard(makeRequest("/api/v1/portal/workouts/999999/leaderboard"), ctx(999999));
    expect(res.status).toBe(404);
  });

  it("returns an empty leaderboard when no scored results exist", async () => {
    const workout = await makeWorkout();
    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();
    expect(body.combinedLeaderboard).toEqual([]);
    expect(body.exerciseBreakdown).toEqual([]);
  });

  it("ranks each scored exercise by best score, picking each client's best attempt", async () => {
    const workout = await makeWorkout();
    const clean = workout.sections[0].exercises[0];
    const jane = await makeClient("Jane", "Smith");
    const john = await makeClient("John", "Doe");

    await prisma.workoutResult.createMany({
      data: [
        { exerciseId: clean.id, clientId: jane.id, notes: "attempt 1", score: 175 },
        { exerciseId: clean.id, clientId: jane.id, notes: "attempt 2 (best)", score: 185 },
        { exerciseId: clean.id, clientId: john.id, notes: "attempt 1", score: 165 },
      ],
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    const cleanBoard = body.exerciseBreakdown.find((e: { exerciseName: string }) => e.exerciseName === "Clean");
    expect(cleanBoard.leaderboard).toEqual([
      { rank: 1, clientName: "Jane Smith", bestScore: 185 },
      { rank: 2, clientName: "John Doe", bestScore: 165 },
    ]);
  });

  it("ranks an ascending (time-based) exercise with lower score winning", async () => {
    const workout = await makeWorkout();
    const run = workout.sections[0].exercises[1];
    const jane = await makeClient("Jane", "Smith");
    const john = await makeClient("John", "Doe");

    await prisma.workoutResult.createMany({
      data: [
        { exerciseId: run.id, clientId: jane.id, notes: "run", score: 420 },
        { exerciseId: run.id, clientId: john.id, notes: "run", score: 390 },
      ],
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    const runBoard = body.exerciseBreakdown.find((e: { exerciseName: string }) => e.exerciseName === "1 Mile Run");
    expect(runBoard.leaderboard).toEqual([
      { rank: 1, clientName: "John Doe", bestScore: 390 },
      { rank: 2, clientName: "Jane Smith", bestScore: 420 },
    ]);
  });

  it("breaks ties by earlier performedAt", async () => {
    const workout = await makeWorkout();
    const clean = workout.sections[0].exercises[0];
    const jane = await makeClient("Jane", "Smith");
    const john = await makeClient("John", "Doe");

    const earlier = new Date("2026-01-01T10:00:00Z");
    const later = new Date("2026-01-02T10:00:00Z");

    await prisma.workoutResult.createMany({
      data: [
        { exerciseId: clean.id, clientId: jane.id, notes: "tie", score: 200, performedAt: later },
        { exerciseId: clean.id, clientId: john.id, notes: "tie", score: 200, performedAt: earlier },
      ],
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    const cleanBoard = body.exerciseBreakdown.find((e: { exerciseName: string }) => e.exerciseName === "Clean");
    expect(cleanBoard.leaderboard[0]).toEqual({ rank: 1, clientName: "John Doe", bestScore: 200 });
  });

  it("computes a combined leaderboard from summed placements across scored exercises", async () => {
    const workout = await makeWorkout();
    const clean = workout.sections[0].exercises[0];
    const run = workout.sections[0].exercises[1];
    const jane = await makeClient("Jane", "Smith");
    const john = await makeClient("John", "Doe");
    const alex = await makeClient("Alex", "Park");

    await prisma.workoutResult.createMany({
      data: [
        // Clean (desc): john 200 (1st), jane 180 (2nd), alex 150 (3rd)
        { exerciseId: clean.id, clientId: john.id, notes: "x", score: 200 },
        { exerciseId: clean.id, clientId: jane.id, notes: "x", score: 180 },
        { exerciseId: clean.id, clientId: alex.id, notes: "x", score: 150 },
        // Run (asc): jane 300 (1st), john 320 (2nd) -- alex did not run
        { exerciseId: run.id, clientId: jane.id, notes: "x", score: 300 },
        { exerciseId: run.id, clientId: john.id, notes: "x", score: 320 },
      ],
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    // jane: 2 (clean) + 1 (run) = 3; john: 1 (clean) + 2 (run) = 3; alex: 3 (clean) only = 3
    // all tie at 3 -- check totals and that all three participants are included
    expect(body.combinedLeaderboard).toHaveLength(3);
    const totals = body.combinedLeaderboard.map((e: { clientName: string; totalPoints: number }) => e.totalPoints);
    expect(totals).toEqual([3, 3, 3]);
    const names = body.combinedLeaderboard.map((e: { clientName: string }) => e.clientName).sort();
    expect(names).toEqual(["Alex Park", "Jane Smith", "John Doe"]);
  });

  it("excludes unscored exercises and clients who never scored", async () => {
    const workout = await makeWorkout();
    const clean = workout.sections[0].exercises[0];
    const jane = await makeClient("Jane", "Smith");

    await prisma.workoutResult.create({
      data: { exerciseId: clean.id, clientId: jane.id, notes: "x", score: 200 },
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    expect(body.exerciseBreakdown).toHaveLength(1);
    expect(body.exerciseBreakdown[0].exerciseName).toBe("Clean");
    expect(body.combinedLeaderboard).toEqual([{ rank: 1, clientName: "Jane Smith", totalPoints: 1 }]);
  });

  it("returns an empty leaderboard when there are scored exercises but no results", async () => {
    const workout = await makeWorkout();
    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();
    expect(body.combinedLeaderboard).toEqual([]);
    expect(body.exerciseBreakdown).toEqual([]);
  });

  it("gives a single client rank 1 by default", async () => {
    const workout = await makeWorkout();
    const clean = workout.sections[0].exercises[0];
    const jane = await makeClient("Jane", "Solo");

    await prisma.workoutResult.create({
      data: { exerciseId: clean.id, clientId: jane.id, notes: "x", score: 100 },
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    expect(body.combinedLeaderboard).toEqual([{ rank: 1, clientName: "Jane Solo", totalPoints: 1 }]);
    expect(body.exerciseBreakdown[0].leaderboard).toEqual([{ rank: 1, clientName: "Jane Solo", bestScore: 100 }]);
  });

  it("returns workoutId, workoutName, and exercise breakdown shape without exposing clientId", async () => {
    const workout = await makeWorkout();
    const clean = workout.sections[0].exercises[0];
    const jane = await makeClient("Jane", "Smith");

    await prisma.workoutResult.create({
      data: { exerciseId: clean.id, clientId: jane.id, notes: "x", score: 200 },
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    expect(body.workoutId).toBe(String(workout.id));
    expect(body.workoutName).toBe("Strength Day");

    const cleanBoard = body.exerciseBreakdown.find((e: { exerciseName: string }) => e.exerciseName === "Clean");
    expect(cleanBoard).toMatchObject({ exerciseName: "Clean", unit: "lb", sortDirection: "desc" });

    const json = JSON.stringify(body);
    expect(json).not.toContain("clientId");
  });

  it("excludes exercises with scored=false from the breakdown entirely", async () => {
    const workout = await makeWorkout();
    const squats = workout.sections[0].exercises[2];
    const jane = await makeClient("Jane", "Smith");

    // Air Squats is not scored; even if a result happened to carry a score, it should not appear.
    await prisma.workoutResult.create({
      data: { exerciseId: squats.id, clientId: jane.id, notes: "x", score: 999 },
    });

    const res = await getLeaderboard(makeRequest(`/api/v1/portal/workouts/${workout.id}/leaderboard`), ctx(workout.id));
    const body = await res.json();

    expect(body.exerciseBreakdown).toEqual([]);
    expect(body.combinedLeaderboard).toEqual([]);
  });
});

describe("Portal workout exercise results with score", () => {
  async function createScoredWorkout() {
    return prisma.workout.create({
      data: {
        name: "Scored Day",
        sections: {
          create: [
            {
              title: "Strength",
              position: 0,
              exercises: { create: [{ name: "Clean", position: 0, scored: true, unit: "lb", sortDirection: "desc" }] },
            },
          ],
        },
      },
      include: { sections: { include: { exercises: true } } },
    });
  }

  it("accepts and persists a score on POST", async () => {
    const workout = await createScoredWorkout();
    const exerciseId = workout.sections[0].exercises[0].id;
    const { cookie } = await signupAndGetCookie("score-post@test.com");

    const res = await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, {
        method: "POST",
        cookie,
        body: { notes: "185lb clean", score: 185 },
      }),
      ctx(exerciseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.score).toBe(185);
  });

  it("works without a score for backwards compatibility", async () => {
    const workout = await createScoredWorkout();
    const exerciseId = workout.sections[0].exercises[0].id;
    const { cookie } = await signupAndGetCookie("score-none@test.com");

    const res = await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, {
        method: "POST",
        cookie,
        body: { notes: "no score logged" },
      }),
      ctx(exerciseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.score).toBeNull();
  });

  it("rejects a non-numeric score", async () => {
    const workout = await createScoredWorkout();
    const exerciseId = workout.sections[0].exercises[0].id;
    const { cookie } = await signupAndGetCookie("score-bad@test.com");

    const res = await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, {
        method: "POST",
        cookie,
        body: { notes: "bad score", score: "not-a-number" },
      }),
      ctx(exerciseId)
    );
    expect(res.status).toBe(400);
  });

  it("returns the score field when listing results via GET", async () => {
    const workout = await createScoredWorkout();
    const exerciseId = workout.sections[0].exercises[0].id;
    const { cookie } = await signupAndGetCookie("score-get@test.com");

    await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, {
        method: "POST",
        cookie,
        body: { notes: "185lb clean", score: 185 },
      }),
      ctx(exerciseId)
    );

    const res = await listResults(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, { cookie }),
      ctx(exerciseId)
    );
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].score).toBe(185);
  });
});
