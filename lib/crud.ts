import { NextRequest } from "next/server";
import { parsePagination, parseSearchQuery, QueryParseError } from "@/lib/query";
import { badRequest, jsonCreated, jsonOk, notFound, parseId } from "@/lib/http";

type DelegateWhere = Record<string, unknown>;

// Prisma's generated delegate types are too strict to share a single structural
// interface across models (each model has its own distinct OrderBy/Where input
// types), so these helpers accept Prisma delegates loosely and rely on runtime
// shape instead of compile-time delegate typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDelegate = any;

export function listHandler(delegate: AnyDelegate, resourceName: string, orderBy: unknown = { id: "asc" }) {
  return async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    let where: DelegateWhere | undefined;
    try {
      where = parseSearchQuery(searchParams.get("q"));
    } catch (e) {
      if (e instanceof QueryParseError) return badRequest(e.message);
      throw e;
    }
    const { skip, take, page, pageSize } = parsePagination(searchParams);
    const [items, total] = await Promise.all([
      delegate.findMany({ where, skip, take, orderBy }),
      delegate.count({ where }),
    ]);
    return jsonOk({ data: items, page, pageSize, total });
  };
}

export function createHandler(
  delegate: AnyDelegate,
  resourceName: string,
  buildData: (body: Record<string, unknown>) => unknown
) {
  return async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object");
    try {
      const created = await delegate.create({ data: buildData(body as Record<string, unknown>) });
      return jsonCreated(created);
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : `Could not create ${resourceName}`);
    }
  };
}

export function getByIdHandler(delegate: AnyDelegate, resourceName: string) {
  return async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);
    if (id === null) return badRequest(`Invalid ${resourceName} id`);
    const item = await delegate.findUnique({ where: { id } });
    if (!item) return notFound(resourceName, rawId);
    return jsonOk(item);
  };
}

export function updateHandler(
  delegate: AnyDelegate,
  resourceName: string,
  buildData: (body: Record<string, unknown>) => unknown
) {
  return async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);
    if (id === null) return badRequest(`Invalid ${resourceName} id`);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object");
    try {
      const updated = await delegate.update({ where: { id }, data: buildData(body as Record<string, unknown>) });
      return jsonOk(updated);
    } catch {
      return notFound(resourceName, rawId);
    }
  };
}

export function toggleHandler(delegate: AnyDelegate, resourceName: string, data: Record<string, unknown>) {
  return async function PUT(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);
    if (id === null) return badRequest(`Invalid ${resourceName} id`);
    try {
      const updated = await delegate.update({ where: { id }, data });
      return jsonOk(updated);
    } catch {
      return notFound(resourceName, rawId);
    }
  };
}

export function deleteHandler(delegate: AnyDelegate, resourceName: string) {
  return async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);
    if (id === null) return badRequest(`Invalid ${resourceName} id`);
    try {
      await delegate.delete({ where: { id } });
      return jsonOk({ deleted: true });
    } catch {
      return notFound(resourceName, rawId);
    }
  };
}
