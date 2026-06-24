import { describe, expect, it } from "vitest";
import { POST as signup } from "@/app/api/v1/portal/signup/route";
import { POST as signin } from "@/app/api/v1/portal/signin/route";
import { POST as signout } from "@/app/api/v1/portal/signout/route";
import { GET as me } from "@/app/api/v1/portal/me/route";
import { makeRequest, sessionCookieFrom } from "./helpers";

async function signupTestClient(email = "portal@test.com", password = "password123") {
  return signup(
    makeRequest("/api/v1/portal/signup", {
      method: "POST",
      body: { firstName: "Port", lastName: "Al", email, password },
    })
  );
}

describe("Portal auth", () => {
  it("signs up, sets a session cookie, and never returns the password hash", async () => {
    const res = await signupTestClient();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe("portal@test.com");
    expect(body.passwordHash).toBeUndefined();
    expect(res.headers.get("set-cookie")).toBeTruthy();
  });

  it("rejects signup with a short password", async () => {
    const res = await signupTestClient("short@test.com", "abc");
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    await signupTestClient("dupe@test.com");
    const res = await signupTestClient("dupe@test.com");
    expect(res.status).toBe(409);
  });

  it("signs in with correct credentials and rejects wrong password", async () => {
    await signupTestClient("login@test.com", "correctpassword");

    const ok = await signin(
      makeRequest("/api/v1/portal/signin", { method: "POST", body: { email: "login@test.com", password: "correctpassword" } })
    );
    expect(ok.status).toBe(200);

    const bad = await signin(
      makeRequest("/api/v1/portal/signin", { method: "POST", body: { email: "login@test.com", password: "wrongpassword" } })
    );
    expect(bad.status).toBe(401);
  });

  it("rejects signin for an unknown email", async () => {
    const res = await signin(
      makeRequest("/api/v1/portal/signin", { method: "POST", body: { email: "nobody@test.com", password: "whatever1" } })
    );
    expect(res.status).toBe(401);
  });

  it("/me reflects the session, 401 without one, and signout clears it", async () => {
    const signedUp = await signupTestClient("me@test.com");
    const cookie = sessionCookieFrom(signedUp);

    const authed = await me(makeRequest("/api/v1/portal/me", { cookie }));
    expect(authed.status).toBe(200);
    expect((await authed.json()).email).toBe("me@test.com");

    const unauthed = await me(makeRequest("/api/v1/portal/me"));
    expect(unauthed.status).toBe(401);

    const signedOut = await signout();
    expect(signedOut.status).toBe(200);
  });
});
