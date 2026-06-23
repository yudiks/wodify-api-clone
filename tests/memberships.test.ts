import { describe, expect, it } from "vitest";
import { POST as createClient } from "@/app/api/v1/clients/route";
import {
  GET as listTemplates,
  POST as createTemplate,
} from "@/app/api/v1/membership-templates/route";
import {
  GET as getTemplate,
  PUT as updateTemplate,
  DELETE as deleteTemplate,
} from "@/app/api/v1/membership-templates/[id]/route";
import { GET as listMemberships, POST as createMembership } from "@/app/api/v1/memberships/route";
import { GET as getMembership } from "@/app/api/v1/memberships/[id]/route";
import { PUT as deactivateMembership } from "@/app/api/v1/memberships/[id]/deactivate/route";
import { ctx, makeRequest } from "./helpers";

async function setupClient() {
  return createClient(
    makeRequest("/api/v1/clients", { method: "POST", body: { firstName: "Mem", lastName: "Ber" } })
  ).then((r) => r.json());
}

describe("Membership Templates API", () => {
  it("full CRUD lifecycle", async () => {
    const created = await createTemplate(
      makeRequest("/api/v1/membership-templates", { method: "POST", body: { name: "Unlimited", price: 99 } })
    ).then((r) => r.json());
    expect(created.name).toBe("Unlimited");

    const list = await listTemplates(makeRequest("/api/v1/membership-templates")).then((r) => r.json());
    expect(list.total).toBe(1);

    const got = await getTemplate(makeRequest(`/api/v1/membership-templates/${created.id}`), ctx(created.id));
    expect(got.status).toBe(200);

    const updated = await updateTemplate(
      makeRequest(`/api/v1/membership-templates/${created.id}`, { method: "PUT", body: { price: 120 } }),
      ctx(created.id)
    ).then((r) => r.json());
    expect(Number(updated.price)).toBe(120);

    const deleted = await deleteTemplate(
      makeRequest(`/api/v1/membership-templates/${created.id}`, { method: "DELETE" }),
      ctx(created.id)
    );
    expect(deleted.status).toBe(200);
  });
});

describe("Memberships API", () => {
  it("creates a membership for a client and deactivates it", async () => {
    const client = await setupClient();
    const template = await createTemplate(
      makeRequest("/api/v1/membership-templates", { method: "POST", body: { name: "Drop-in", price: 20 } })
    ).then((r) => r.json());

    const membership = await createMembership(
      makeRequest("/api/v1/memberships", {
        method: "POST",
        body: { clientId: client.id, templateId: template.id },
      })
    ).then((r) => r.json());
    expect(membership.clientId).toBe(client.id);
    expect(membership.isActive).toBe(true);

    const list = await listMemberships(makeRequest("/api/v1/memberships")).then((r) => r.json());
    expect(list.total).toBe(1);

    const got = await getMembership(makeRequest(`/api/v1/memberships/${membership.id}`), ctx(membership.id));
    expect(got.status).toBe(200);

    const deactivated = await deactivateMembership(
      makeRequest(`/api/v1/memberships/${membership.id}/deactivate`, { method: "PUT" }),
      ctx(membership.id)
    ).then((r) => r.json());
    expect(deactivated.isActive).toBe(false);
  });

  it("rejects a membership without clientId/templateId", async () => {
    const res = await createMembership(makeRequest("/api/v1/memberships", { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });
});
