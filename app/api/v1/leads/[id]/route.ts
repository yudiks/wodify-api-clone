import { prisma } from "@/lib/db";
import { deleteHandler, getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.lead, "Lead");

export const PUT = updateHandler(prisma.lead, "Lead", (body) => ({
  firstName: body.firstName !== undefined ? String(body.firstName) : undefined,
  lastName: body.lastName !== undefined ? String(body.lastName) : undefined,
  email: body.email !== undefined ? String(body.email) : undefined,
  phone: body.phone !== undefined ? String(body.phone) : undefined,
  source: body.source !== undefined ? String(body.source) : undefined,
  statusId: body.statusId !== undefined ? Number(body.statusId) : undefined,
  notes: body.notes !== undefined ? String(body.notes) : undefined,
}));

export const DELETE = deleteHandler(prisma.lead, "Lead");
