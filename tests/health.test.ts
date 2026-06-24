import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/v1/health/route";
import { makeRequest } from "./helpers";

describe("Health API", () => {
  it("returns ok status", async () => {
    const res = await health(makeRequest("/api/v1/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
