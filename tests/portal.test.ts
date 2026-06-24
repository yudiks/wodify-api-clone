import { describe, expect, it } from "vitest";
import { POST as signup } from "@/app/api/v1/portal/signup/route";
import { GET as listPortalClasses } from "@/app/api/v1/portal/classes/route";
import { GET as getPortalClass } from "@/app/api/v1/portal/classes/[id]/route";
import { POST as reserve } from "@/app/api/v1/portal/classes/[id]/reserve/route";
import { GET as myReservations } from "@/app/api/v1/portal/reservations/route";
import { PUT as cancelReservation } from "@/app/api/v1/portal/reservations/[id]/cancel/route";
import { POST as createClass } from "@/app/api/v1/classes/route";
import { ctx, makeRequest, sessionCookieFrom } from "./helpers";

async function signupAndGetCookie(email: string) {
  const res = await signup(
    makeRequest("/api/v1/portal/signup", {
      method: "POST",
      body: { firstName: "P", lastName: "Q", email, password: "password123" },
    })
  );
  return { client: await res.clone().json(), cookie: sessionCookieFrom(res) };
}

async function makeClass(capacity = 1) {
  const res = await createClass(
    makeRequest("/api/v1/classes", {
      method: "POST",
      body: {
        name: "WOD",
        startDateTime: new Date(Date.now() + 3600_000).toISOString(),
        endDateTime: new Date(Date.now() + 7200_000).toISOString(),
        capacity,
      },
    })
  );
  return res.json();
}

describe("Portal classes & reservations", () => {
  it("lists only upcoming classes with spotsRemaining", async () => {
    const klass = await makeClass(2);
    const { cookie } = await signupAndGetCookie("browse@test.com");

    const res = await listPortalClasses(makeRequest("/api/v1/portal/classes"));
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(klass.id);
    expect(body.data[0].spotsRemaining).toBe(2);
    void cookie;
  });

  it("requires a session to reserve", async () => {
    const klass = await makeClass();
    const res = await reserve(makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST" }), ctx(klass.id));
    expect(res.status).toBe(401);
  });

  it("reserves a spot, then waitlists once full, scoped to the signed-in client", async () => {
    const klass = await makeClass(1);
    const { cookie: cookieA } = await signupAndGetCookie("a@test.com");
    const { cookie: cookieB } = await signupAndGetCookie("b@test.com");

    const resA = await reserve(
      makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie: cookieA }),
      ctx(klass.id)
    );
    expect(resA.status).toBe(201);
    expect((await resA.json()).status).toBe("Reserved");

    const resB = await reserve(
      makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie: cookieB }),
      ctx(klass.id)
    );
    expect((await resB.json()).status).toBe("Waitlisted");
  });

  it("rejects a duplicate reservation for the same class", async () => {
    const klass = await makeClass(5);
    const { cookie } = await signupAndGetCookie("twice@test.com");

    const first = await reserve(
      makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie }),
      ctx(klass.id)
    );
    expect(first.status).toBe(201);

    const second = await reserve(
      makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie }),
      ctx(klass.id)
    );
    expect(second.status).toBe(409);
  });

  it("lists only the signed-in client's own reservations", async () => {
    const klass = await makeClass(5);
    const { cookie: cookieA } = await signupAndGetCookie("ownerA@test.com");
    const { cookie: cookieB } = await signupAndGetCookie("ownerB@test.com");

    await reserve(makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie: cookieA }), ctx(klass.id));

    const resA = await myReservations(makeRequest("/api/v1/portal/reservations", { cookie: cookieA }));
    expect((await resA.json()).data).toHaveLength(1);

    const resB = await myReservations(makeRequest("/api/v1/portal/reservations", { cookie: cookieB }));
    expect((await resB.json()).data).toHaveLength(0);
  });

  it("lets a client cancel their own reservation but not someone else's", async () => {
    const klass = await makeClass(5);
    const { cookie: cookieA } = await signupAndGetCookie("cancelA@test.com");
    const { cookie: cookieB } = await signupAndGetCookie("cancelB@test.com");

    const created = await reserve(
      makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie: cookieA }),
      ctx(klass.id)
    ).then((r) => r.json());

    const forbidden = await cancelReservation(
      makeRequest(`/api/v1/portal/reservations/${created.id}/cancel`, { method: "PUT", cookie: cookieB }),
      ctx(created.id)
    );
    expect(forbidden.status).toBe(403);

    const ok = await cancelReservation(
      makeRequest(`/api/v1/portal/reservations/${created.id}/cancel`, { method: "PUT", cookie: cookieA }),
      ctx(created.id)
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).status).toBe("Cancelled");
  });
});

describe("Portal class detail", () => {
  it("requires a session", async () => {
    const klass = await makeClass();
    const res = await getPortalClass(makeRequest(`/api/v1/portal/classes/${klass.id}`), ctx(klass.id));
    expect(res.status).toBe(401);
  });

  it("404s for a missing class", async () => {
    const { cookie } = await signupAndGetCookie("detail404@test.com");
    const res = await getPortalClass(
      makeRequest("/api/v1/portal/classes/999999", { cookie }),
      ctx(999999)
    );
    expect(res.status).toBe(404);
  });

  it("includes attendees and the viewer's own reservation status", async () => {
    const klass = await makeClass(5);
    const { cookie: cookieA } = await signupAndGetCookie("detailA@test.com");
    const { cookie: cookieB } = await signupAndGetCookie("detailB@test.com");

    await reserve(makeRequest(`/api/v1/portal/classes/${klass.id}/reserve`, { method: "POST", cookie: cookieA }), ctx(klass.id));

    const asA = await getPortalClass(makeRequest(`/api/v1/portal/classes/${klass.id}`, { cookie: cookieA }), ctx(klass.id));
    const bodyA = await asA.json();
    expect(bodyA.attendees).toHaveLength(1);
    expect(bodyA.myReservation?.status).toBe("Reserved");

    const asB = await getPortalClass(makeRequest(`/api/v1/portal/classes/${klass.id}`, { cookie: cookieB }), ctx(klass.id));
    const bodyB = await asB.json();
    expect(bodyB.attendees).toHaveLength(1);
    expect(bodyB.myReservation).toBeNull();
  });
});
