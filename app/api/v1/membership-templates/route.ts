import { prisma } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.membershipTemplate, "MembershipTemplate");

export const POST = createHandler(prisma.membershipTemplate, "MembershipTemplate", (body) => {
  if (!body.name) throw new Error("name is required");
  return {
    name: String(body.name),
    description: body.description ? String(body.description) : undefined,
    price: body.price !== undefined ? Number(body.price) : undefined,
  };
});
