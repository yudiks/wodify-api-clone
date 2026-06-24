import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST as signup } from "@/app/api/v1/portal/signup/route";
import { GET as listPortalWorkouts } from "@/app/api/v1/portal/workouts/route";
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

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function createStructuredWorkout(scheduledDate = todayMidnight()) {
  return prisma.workout.create({
    data: {
      name: "Functional Fitness",
      program: "Functional Fitness",
      scheduledDate,
      sections: {
        create: [
          {
            title: "General Warm Up",
            notes: "Two sets of:",
            position: 0,
            exercises: { create: [{ name: "Air Squats", prescription: "20", position: 0 }] },
          },
          {
            title: "Strength (Part A)",
            position: 1,
            exercises: {
              create: [{ name: "Clean", prescription: "Every 2 minutes, for 16 minutes...", position: 0 }],
            },
          },
        ],
      },
    },
    include: { sections: { include: { exercises: true } } },
  });
}

describe("Portal workouts", () => {
  it("returns today's scheduled workout with nested sections and exercises", async () => {
    await createStructuredWorkout();

    const res = await listPortalWorkouts(makeRequest("/api/v1/portal/workouts"));
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].sections).toHaveLength(2);
    expect(body.data[0].sections[0].title).toBe("General Warm Up");
    expect(body.data[0].sections[0].exercises[0].name).toBe("Air Squats");
    expect(body.programs).toContain("Functional Fitness");
  });

  it("returns no workouts for a day with nothing scheduled", async () => {
    const tomorrow = new Date(todayMidnight().getTime() + 24 * 60 * 60 * 1000);
    await createStructuredWorkout(tomorrow);

    const res = await listPortalWorkouts(makeRequest("/api/v1/portal/workouts"));
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it("filters by program", async () => {
    await createStructuredWorkout();

    const matching = await listPortalWorkouts(
      makeRequest(`/api/v1/portal/workouts?program=${encodeURIComponent("Functional Fitness")}`)
    );
    expect((await matching.json()).data).toHaveLength(1);

    const nonMatching = await listPortalWorkouts(
      makeRequest(`/api/v1/portal/workouts?program=${encodeURIComponent("Yoga")}`)
    );
    expect((await nonMatching.json()).data).toHaveLength(0);
  });
});

describe("Portal workout exercise results", () => {
  it("requires a session for both GET and POST", async () => {
    const workout = await createStructuredWorkout();
    const exerciseId = workout.sections[1].exercises[0].id;

    const getRes = await listResults(makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`), ctx(exerciseId));
    expect(getRes.status).toBe(401);

    const postRes = await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, { method: "POST", body: { notes: "x" } }),
      ctx(exerciseId)
    );
    expect(postRes.status).toBe(401);
  });

  it("logs a result and lists it back, newest first, scoped to the signed-in client", async () => {
    const workout = await createStructuredWorkout();
    const exerciseId = workout.sections[1].exercises[0].id;
    const { cookie: cookieA } = await signupAndGetCookie("resultsA@test.com");
    const { cookie: cookieB } = await signupAndGetCookie("resultsB@test.com");

    const created = await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, {
        method: "POST",
        cookie: cookieA,
        body: { notes: "185lb x1, 195lb x1, 205lb x1" },
      }),
      ctx(exerciseId)
    );
    expect(created.status).toBe(201);

    const myHistory = await listResults(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, { cookie: cookieA }),
      ctx(exerciseId)
    );
    const myBody = await myHistory.json();
    expect(myBody.data).toHaveLength(1);
    expect(myBody.data[0].notes).toBe("185lb x1, 195lb x1, 205lb x1");

    const otherHistory = await listResults(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, { cookie: cookieB }),
      ctx(exerciseId)
    );
    expect((await otherHistory.json()).data).toHaveLength(0);
  });

  it("rejects an empty result", async () => {
    const workout = await createStructuredWorkout();
    const exerciseId = workout.sections[1].exercises[0].id;
    const { cookie } = await signupAndGetCookie("emptyresult@test.com");

    const res = await createResult(
      makeRequest(`/api/v1/portal/workouts/exercises/${exerciseId}/results`, { method: "POST", cookie, body: { notes: "  " } }),
      ctx(exerciseId)
    );
    expect(res.status).toBe(400);
  });

  it("404s for a missing exercise", async () => {
    const { cookie } = await signupAndGetCookie("missingexercise@test.com");
    const res = await createResult(
      makeRequest("/api/v1/portal/workouts/exercises/999999/results", { method: "POST", cookie, body: { notes: "x" } }),
      ctx(999999)
    );
    expect(res.status).toBe(404);
  });
});
