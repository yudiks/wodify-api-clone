import { describe, expect, it } from "vitest";
import { GET as listClients, POST as createClient } from "@/app/api/v1/clients/route";
import { makeRequest } from "./helpers";

// Regression coverage for the query-syntax edge cases the ResourceManager
// nameLookup feature depends on (see lib/query.ts coerceList / parseSearchQuery
// and components/ResourceManager.tsx resolveLookups).

async function createTestClient(firstName = "Test", lastName = "Client") {
  const res = await createClient(
    makeRequest("/api/v1/clients", { method: "POST", body: { firstName, lastName } })
  );
  return res.json();
}

describe("id|in query syntax (lookup feature dependency)", () => {
  it("returns only the matching rows when ids are a mix of existing and nonexistent", async () => {
    const a = await createTestClient("Alice", "A");
    const b = await createTestClient("Bob", "B");

    const res = await listClients(
      makeRequest(`/api/v1/clients?q=${encodeURIComponent(`id|in|{${a.id},999999,${b.id},888888}`)}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    const ids = body.data.map((c: { id: number }) => c.id).sort();
    expect(ids).toEqual([a.id, b.id].sort());
  });

  it("returns an empty array (not an error) when no ids match", async () => {
    const res = await listClients(
      makeRequest(`/api/v1/clients?q=${encodeURIComponent("id|in|{999999,888888}")}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns an empty array (not an error) when the id set itself is empty", async () => {
    // coerceList("{}") strips the braces leaving "", which must map to []
    // (no items) rather than [""] (one empty-string element, which Prisma
    // rejects for an Int column with a PrismaClientValidationError).
    const res = await listClients(
      makeRequest(`/api/v1/clients?q=${encodeURIComponent("id|in|{}")}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});
