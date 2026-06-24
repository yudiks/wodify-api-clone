import { NextRequest } from "next/server";
import { getSessionClient, publicClient } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  const client = await getSessionClient(request);
  if (!client) return jsonError("Not signed in", 401);
  return jsonOk(publicClient(client));
}
