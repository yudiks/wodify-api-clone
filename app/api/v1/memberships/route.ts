import { prisma } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.membership, "Membership");

export const POST = createHandler(prisma.membership, "Membership", (body) => {
  if (!body.clientId || !body.templateId) {
    throw new Error("clientId and templateId are required");
  }
  return {
    clientId: Number(body.clientId),
    templateId: Number(body.templateId),
    startDate: body.startDate ? new Date(String(body.startDate)) : undefined,
    endDate: body.endDate ? new Date(String(body.endDate)) : undefined,
    autoRenew: body.autoRenew !== undefined ? Boolean(body.autoRenew) : undefined,
  };
});
