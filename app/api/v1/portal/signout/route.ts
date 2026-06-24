import { clearSessionCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export async function POST() {
  return clearSessionCookie(jsonOk({ signedOut: true }));
}
