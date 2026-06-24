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

  // KNOWN BUG: an empty id set serialized as `{}` causes coerceList to split("")
  // into [""], which Prisma rejects for an Int column, producing a 500.
  // The ResourceManager UI never triggers this directly (resolveLookups skips
  // the fetch when there are 0 ids to resolve), but the underlying query-syntax
  // helper is broken for this input if called directly or reused elsewhere.
  it("documents that id|in|{} (empty list) currently throws instead of returning an empty result", async () => {
    // coerceList("{}") strips the braces leaving "", and "".split(",") yields
    // [""] (one empty-string element) rather than []. Prisma then rejects
    // `in: [""]` against an Int column with a PrismaClientValidationError,
    // which is uncaught by listHandler and propagates as a thrown/rejected
    // promise (surfaced as an HTTP 500 by Next.js's route error boundary when
    // hit over real HTTP — confirmed via curl against the dev server).
    //
    // If/when lib/query.ts's coerceList is fixed to treat "" as [] (no items),
    // change this test to assert a 200 response with an empty data array.
    await expect(
      listClients(makeRequest(`/api/v1/clients?q=${encodeURIComponent("id|in|{}")}`))
    ).rejects.toThrow();
  });
});
