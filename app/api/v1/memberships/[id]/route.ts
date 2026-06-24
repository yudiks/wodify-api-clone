import { prisma } from "@/lib/db";
import { deleteHandler, getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.membership, "Membership");

export const PUT = updateHandler(prisma.membership, "Membership", (body) => ({
  clientId: body.clientId !== undefined ? Number(body.clientId) : undefined,
  templateId: body.templateId !== undefined ? Number(body.templateId) : undefined,
  startDate: body.startDate !== undefined ? new Date(String(body.startDate)) : undefined,
  endDate: body.endDate !== undefined ? new Date(String(body.endDate)) : undefined,
  autoRenew: body.autoRenew !== undefined ? Boolean(body.autoRenew) : undefined,
}));

export const DELETE = deleteHandler(prisma.membership, "Membership");
