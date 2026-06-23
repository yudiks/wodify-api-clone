import { describe, expect, it } from "vitest";
import { POST as createClient } from "@/app/api/v1/clients/route";
import { GET as listClasses, POST as createClass } from "@/app/api/v1/classes/route";
import { GET as getClass } from "@/app/api/v1/classes/[id]/route";
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
