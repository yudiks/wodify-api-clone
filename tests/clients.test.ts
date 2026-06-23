import { describe, expect, it } from "vitest";
import { GET as listClients, POST as createClient } from "@/app/api/v1/clients/route";
import { GET as getClient, PUT as updateClient } from "@/app/api/v1/clients/[id]/route";
import { PUT as deactivate } from "@/app/api/v1/clients/[id]/deactivate/route";
import { PUT as reactivate } from "@/app/api/v1/clients/[id]/reactivate/route";
import { PUT as suspend } from "@/app/api/v1/clients/[id]/suspend/route";
import { PUT as reinstate } from "@/app/api/v1/clients/[id]/reinstate/route";
import { ctx, makeRequest } from "./helpers";

async function createTestClient(firstName = "Test", lastName = "Client") {
  const res = await createClient(
    makeRequest("/api/v1/clients", { method: "POST", body: { firstName, lastName } })
  );
  return res.json();
}

describe("Clients API", () => {
  it("creates and lists clients", async () => {
    await createTestClient("Jane", "Doe");
    const res = await listClients(makeRequest("/api/v1/clients"));
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].firstName).toBe("Jane");
  });

  it("gets a client by id, 404 otherwise", async () => {
    const client = await createTestClient();
    const ok = await getClient(makeRequest(`/api/v1/clients/${client.id}`), ctx(client.id));
    expect(ok.status).toBe(200);

    const missing = await getClient(makeRequest("/api/v1/clients/999999"), ctx(999999));
    expect(missing.status).toBe(404);
  });

  it("updates a client", async () => {
    const client = await createTestClient();
    const res = await updateClient(
      makeRequest(`/api/v1/clients/${client.id}`, { method: "PUT", body: { email: "new@example.com" } }),
      ctx(client.id)
    );
    const body = await res.json();
    expect(body.email).toBe("new@example.com");
  });

  it("deactivates and reactivates a client", async () => {
    const client = await createTestClient();

    const deactivated = await deactivate(makeRequest(`/api/v1/clients/${client.id}/deactivate`, { method: "PUT" }), ctx(client.id));
    expect((await deactivated.json()).isActive).toBe(false);

    const reactivated = await reactivate(makeRequest(`/api/v1/clients/${client.id}/reactivate`, { method: "PUT" }), ctx(client.id));
    expect((await reactivated.json()).isActive).toBe(true);
  });

  it("suspends and reinstates a client", async () => {
    const client = await createTestClient();

    const suspended = await suspend(makeRequest(`/api/v1/clients/${client.id}/suspend`, { method: "PUT" }), ctx(client.id));
    expect((await suspended.json()).isSuspended).toBe(true);

    const reinstated = await reinstate(makeRequest(`/api/v1/clients/${client.id}/reinstate`, { method: "PUT" }), ctx(client.id));
    expect((await reinstated.json()).isSuspended).toBe(false);
  });

  it("404s when toggling a missing client", async () => {
    const res = await deactivate(makeRequest("/api/v1/clients/999999/deactivate", { method: "PUT" }), ctx(999999));
    expect(res.status).toBe(404);
  });
});
