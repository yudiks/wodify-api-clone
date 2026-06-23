import { describe, expect, it } from "vitest";
import { GET as listLeads, POST as createLead } from "@/app/api/v1/leads/route";
import {
  GET as getLead,
  PUT as updateLead,
  DELETE as deleteLead,
} from "@/app/api/v1/leads/[id]/route";
import { ctx, makeRequest } from "./helpers";

describe("Leads API", () => {
  it("creates a lead", async () => {
    const res = await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "Ada", lastName: "Lovelace" } })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.firstName).toBe("Ada");
    expect(body.id).toBeDefined();
  });

  it("rejects creation without required fields", async () => {
    const res = await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "OnlyFirst" } })
    );
    expect(res.status).toBe(400);
  });

  it("lists leads", async () => {
    await createLead(makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "A", lastName: "B" } }));
    await createLead(makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "C", lastName: "D" } }));

    const res = await listLeads(makeRequest("/api/v1/leads"));
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.data).toHaveLength(2);
  });

  it("searches leads with q syntax", async () => {
    await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "Match", lastName: "Me", source: "Website" } })
    );
    await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "Skip", lastName: "Me", source: "Referral" } })
    );

    const res = await listLeads(makeRequest(`/api/v1/leads?q=${encodeURIComponent("source|eq|'Website'")}`));
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].firstName).toBe("Match");
  });

  it("gets a lead by id", async () => {
    const created = await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "Get", lastName: "Me" } })
    ).then((r) => r.json());

    const res = await getLead(makeRequest(`/api/v1/leads/${created.id}`), ctx(created.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(created.id);
  });

  it("returns 404 for missing lead", async () => {
    const res = await getLead(makeRequest("/api/v1/leads/999999"), ctx(999999));
    expect(res.status).toBe(404);
  });

  it("updates a lead", async () => {
    const created = await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "Old", lastName: "Name" } })
    ).then((r) => r.json());

    const res = await updateLead(
      makeRequest(`/api/v1/leads/${created.id}`, { method: "PUT", body: { firstName: "New" } }),
      ctx(created.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe("New");
    expect(body.lastName).toBe("Name");
  });

  it("deletes a lead", async () => {
    const created = await createLead(
      makeRequest("/api/v1/leads", { method: "POST", body: { firstName: "Del", lastName: "Me" } })
    ).then((r) => r.json());

    const res = await deleteLead(makeRequest(`/api/v1/leads/${created.id}`, { method: "DELETE" }), ctx(created.id));
    expect(res.status).toBe(200);

    const getRes = await getLead(makeRequest(`/api/v1/leads/${created.id}`), ctx(created.id));
    expect(getRes.status).toBe(404);
  });
});
