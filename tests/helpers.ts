import { NextRequest, NextResponse } from "next/server";

export function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown; cookie?: string }
): NextRequest {
  const fullUrl = url.startsWith("http") ? url : `http://localhost${url}`;
  const headers: Record<string, string> = {};
  if (init?.body !== undefined) headers["Content-Type"] = "application/json";
  if (init?.cookie) headers["cookie"] = init.cookie;

  return new NextRequest(fullUrl, {
    method: init?.method ?? "GET",
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers,
  });
}

export function ctx(id: string | number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

// Extracts a `name=value` cookie pair from a route handler's Set-Cookie header,
// suitable for passing back into makeRequest's `cookie` option on the next call.
export function sessionCookieFrom(response: NextResponse): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Response did not set a cookie");
  return setCookie.split(";")[0];
}
