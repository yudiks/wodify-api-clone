import { prisma } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.coach, "Coach");

export const POST = createHandler(prisma.coach, "Coach", (body) => {
  if (!body.firstName || !body.lastName) {
    throw new Error("firstName and lastName are required");
  }
  return {
    firstName: String(body.firstName),
    lastName: String(body.lastName),
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
  };
});
