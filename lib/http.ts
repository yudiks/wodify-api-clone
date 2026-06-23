import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function jsonCreated(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function notFound(resource: string, id: string | number) {
  return jsonError(`${resource} ${id} not found`, 404);
}

export function badRequest(message: string) {
  return jsonError(message, 400);
}

export function parseId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
