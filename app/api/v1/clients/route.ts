import { prisma } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.client, "Client");

export const POST = createHandler(prisma.client, "Client", (body) => {
  if (!body.firstName || !body.lastName) {
    throw new Error("firstName and lastName are required");
  }
  return {
    firstName: String(body.firstName),
    lastName: String(body.lastName),
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    statusId: body.statusId ? Number(body.statusId) : undefined,
  };
});
