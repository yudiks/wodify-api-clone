import { NextRequest } from "next/server";

export function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown }
): NextRequest {
  const fullUrl = url.startsWith("http") ? url : `http://localhost${url}`;
  return new NextRequest(fullUrl, {
    method: init?.method ?? "GET",
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
  });
}

export function ctx(id: string | number) {
  return { params: Promise.resolve({ id: String(id) }) };
}
