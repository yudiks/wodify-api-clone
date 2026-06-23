import { prisma } from "@/lib/db";
import { getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.client, "Client");

export const PUT = updateHandler(prisma.client, "Client", (body) => ({
  firstName: body.firstName !== undefined ? String(body.firstName) : undefined,
  lastName: body.lastName !== undefined ? String(body.lastName) : undefined,
  email: body.email !== undefined ? String(body.email) : undefined,
  phone: body.phone !== undefined ? String(body.phone) : undefined,
  statusId: body.statusId !== undefined ? Number(body.statusId) : undefined,
}));
