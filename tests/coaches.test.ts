import { describe, expect, it } from "vitest";
import { GET as listCoaches, POST as createCoach } from "@/app/api/v1/coaches/route";
import {
  GET as getCoach,
  PUT as updateCoach,
  DELETE as deleteCoach,
} from "@/app/api/v1/coaches/[id]/route";
import { ctx, makeRequest } from "./helpers";

describe("Coaches API", () => {
  it("creates a coach", async () => {
    const res = await createCoach(
      makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Ada", lastName: "Lovelace" } })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.firstName).toBe("Ada");
    expect(body.id).toBeDefined();
  });

  it("rejects creation without required fields", async () => {
    const res = await createCoach(
      makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "OnlyFirst" } })
    );
    expect(res.status).toBe(400);
  });

  it("lists coaches", async () => {
    await createCoach(makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "A", lastName: "B" } }));
    await createCoach(makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "C", lastName: "D" } }));

    const res = await listCoaches(makeRequest("/api/v1/coaches"));
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.data).toHaveLength(2);
  });

  it("searches coaches by name with q syntax", async () => {
    await createCoach(makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Match", lastName: "Me" } }));
    await createCoach(makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Skip", lastName: "Me" } }));

    const res = await listCoaches(
      makeRequest(`/api/v1/coaches?q=${encodeURIComponent("firstName|like|'Match'")}`)
    );
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].firstName).toBe("Match");
  });

  it("gets a coach by id, 404 otherwise", async () => {
    const created = await createCoach(
      makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Get", lastName: "Me" } })
    ).then((r) => r.json());

    const res = await getCoach(makeRequest(`/api/v1/coaches/${created.id}`), ctx(created.id));
    expect(res.status).toBe(200);

    const missing = await getCoach(makeRequest("/api/v1/coaches/999999"), ctx(999999));
    expect(missing.status).toBe(404);
  });

  it("updates a coach", async () => {
    const created = await createCoach(
      makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Old", lastName: "Name" } })
    ).then((r) => r.json());

    const res = await updateCoach(
      makeRequest(`/api/v1/coaches/${created.id}`, { method: "PUT", body: { firstName: "New" } }),
      ctx(created.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("New");
    expect(body.lastName).toBe("Name");
  });

  it("deletes a coach", async () => {
    const created = await createCoach(
      makeRequest("/api/v1/coaches", { method: "POST", body: { firstName: "Del", lastName: "Me" } })
    ).then((r) => r.json());

    const res = await deleteCoach(makeRequest(`/api/v1/coaches/${created.id}`, { method: "DELETE" }), ctx(created.id));
    expect(res.status).toBe(200);

    const getRes = await getCoach(makeRequest(`/api/v1/coaches/${created.id}`), ctx(created.id));
    expect(getRes.status).toBe(404);
  });
});
