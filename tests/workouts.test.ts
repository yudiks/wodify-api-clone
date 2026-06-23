import { describe, expect, it } from "vitest";
import { GET as listWorkouts, POST as createWorkout } from "@/app/api/v1/workouts/route";
import {
  GET as getWorkout,
  PUT as updateWorkout,
  DELETE as deleteWorkout,
} from "@/app/api/v1/workouts/[id]/route";
import { ctx, makeRequest } from "./helpers";

describe("Workouts API", () => {
  it("full CRUD lifecycle", async () => {
    const created = await createWorkout(
      makeRequest("/api/v1/workouts", { method: "POST", body: { name: "Fran", type: "For Time" } })
    ).then((r) => r.json());
    expect(created.name).toBe("Fran");

    const list = await listWorkouts(makeRequest("/api/v1/workouts")).then((r) => r.json());
    expect(list.total).toBe(1);

    const got = await getWorkout(makeRequest(`/api/v1/workouts/${created.id}`), ctx(created.id));
    expect(got.status).toBe(200);

    const updated = await updateWorkout(
      makeRequest(`/api/v1/workouts/${created.id}`, { method: "PUT", body: { description: "21-15-9" } }),
      ctx(created.id)
    ).then((r) => r.json());
    expect(updated.description).toBe("21-15-9");

    const deleted = await deleteWorkout(makeRequest(`/api/v1/workouts/${created.id}`, { method: "DELETE" }), ctx(created.id));
    expect(deleted.status).toBe(200);

    const missing = await getWorkout(makeRequest(`/api/v1/workouts/${created.id}`), ctx(created.id));
    expect(missing.status).toBe(404);
  });

  it("rejects creation without a name", async () => {
    const res = await createWorkout(makeRequest("/api/v1/workouts", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("searches workouts by type", async () => {
    await createWorkout(makeRequest("/api/v1/workouts", { method: "POST", body: { name: "Fran", type: "For Time" } }));
    await createWorkout(makeRequest("/api/v1/workouts", { method: "POST", body: { name: "EMOM", type: "Interval" } }));

    const res = await listWorkouts(
      makeRequest(`/api/v1/workouts?q=${encodeURIComponent("type|eq|'Interval'")}`)
    ).then((r) => r.json());
    expect(res.total).toBe(1);
    expect(res.data[0].name).toBe("EMOM");
  });
});
