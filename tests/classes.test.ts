import { describe, expect, it } from "vitest";
import { POST as createClient } from "@/app/api/v1/clients/route";
import { POST as createCoach } from "@/app/api/v1/coaches/route";
import { GET as listClasses, POST as createClass } from "@/app/api/v1/classes/route";
import { GET as getClass, PUT as updateClass } from "@/app/api/v1/classes/[id]/route";
import { POST as createReservation } from "@/app/api/v1/classes/[id]/reservations/route";
import { POST as createSignIn } from "@/app/api/v1/classes/[id]/sign-ins/route";
import { GET as listReservations } from "@/app/api/v1/reservations/route";
import { PUT as cancelReservation } from "@/app/api/v1/reservations/[id]/cancel/route";
import { GET as listSignIns } from "@/app/api/v1/sign-ins/route";
import { ctx, makeRequest } from "./helpers";

async function setupClassAndClient() {
  const client = await createClient(
    makeRequest("/api/v1/clients", { method: "POST", body: { firstName: "Cl", lastName: "Ass" } })
  ).then((r) => r.json());

  const klass = await createClass(
    makeRequest("/api/v1/classes", {
      method: "POST",
      body: {
        name: "WOD",
        startDateTime: new Date().toISOString(),
        endDateTime: new Date(Date.now() + 3600_000).toISOString(),
        capacity: 1,
      },
    })
  ).then((r) => r.json());

  return { client, klass };
}

describe("Classes API", () => {
  it("creates and lists classes, gets by id, 404 otherwise", async () => {
    const { klass } = await setupClassAndClient();

    const list = await listClasses(makeRequest("/api/v1/classes")).then((r) => r.json());
    expect(list.total).toBe(1);

    const got = await getClass(makeRequest(`/api/v1/classes/${klass.id}`), ctx(klass.id));
    expect(got.status).toBe(200);

    const missing = await getClass(makeRequest("/api/v1/classes/999999"), ctx(999999));
    expect(missing.status).toBe(404);
  });

  it("reserves a spot, waitlists once full, and cancels a reservation", async () => {
    const { client, klass } = await setupClassAndClient();

    const res1 = await createReservation(
      makeRequest(`/api/v1/classes/${klass.id}/reservations`, { method: "POST", body: { clientId: client.id } }),
      ctx(klass.id)
    ).then((r) => r.json());
    expect(res1.status).toBe("Reserved");

    const client2 = await createClient(
      makeRequest("/api/v1/clients", { method: "POST", body: { firstName: "Wait", lastName: "List" } })
    ).then((r) => r.json());

    const res2 = await createReservation(
      makeRequest(`/api/v1/classes/${klass.id}/reservations`, { method: "POST", body: { clientId: client2.id } }),
      ctx(klass.id)
    ).then((r) => r.json());
    expect(res2.status).toBe("Waitlisted");

    const list = await listReservations(makeRequest("/api/v1/reservations")).then((r) => r.json());
    expect(list.total).toBe(2);

    const cancelled = await cancelReservation(
      makeRequest(`/api/v1/reservations/${res1.id}/cancel`, { method: "PUT" }),
      ctx(res1.id)
    ).then((r) => r.json());
    expect(cancelled.status).toBe("Cancelled");
  });

  it("signs a client into a class and lists sign-ins", async () => {
    const { client, klass } = await setupClassAndClient();

    const signIn = await createSignIn(
      makeRequest(`/api/v1/classes/${klass.id}/sign-ins`, { method: "POST", body: { clientId: client.id } }),
      ctx(klass.id)
    );
    expect(signIn.status).toBe(201);

    const list = await listSignIns(makeRequest("/api/v1/sign-ins")).then((r) => r.json());
    expect(list.total).toBe(1);
  });

  it("edits a class's fields, including assigning and clearing a coach", async () => {
    const { klass } = await setupClassAndClient();

    const coach = await createCoach(
      makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Cori", lastName: "Coach" } })
    ).then((r) => r.json());

    const assigned = await updateClass(
      makeRequest(`/api/v1/classes/${klass.id}`, {
        method: "PUT",
        body: { name: "WOD (updated)", capacity: 30, coachId: coach.id },
      }),
      ctx(klass.id)
    ).then((r) => r.json());
    expect(assigned.name).toBe("WOD (updated)");
    expect(assigned.capacity).toBe(30);
    expect(assigned.coachId).toBe(coach.id);
    // Fields not present in the PUT body must be left unchanged.
    expect(new Date(assigned.startDateTime)).toBeInstanceOf(Date);

    const cleared = await updateClass(
      makeRequest(`/api/v1/classes/${klass.id}`, { method: "PUT", body: { coachId: null } }),
      ctx(klass.id)
    ).then((r) => r.json());
    expect(cleared.coachId).toBeNull();
  });

  it("404s when editing a missing class", async () => {
    const res = await updateClass(
      makeRequest("/api/v1/classes/999999", { method: "PUT", body: { name: "Nope" } }),
      ctx(999999)
    );
    expect(res.status).toBe(404);
  });

  it("404s when reserving into a missing class", async () => {
    const client = await createClient(
      makeRequest("/api/v1/clients", { method: "POST", body: { firstName: "No", lastName: "Class" } })
    ).then((r) => r.json());

    const res = await createReservation(
      makeRequest("/api/v1/classes/999999/reservations", { method: "POST", body: { clientId: client.id } }),
      ctx(999999)
    );
    expect(res.status).toBe(404);
  });
});
