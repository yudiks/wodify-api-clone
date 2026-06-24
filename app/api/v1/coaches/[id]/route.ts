import { prisma } from "@/lib/db";
import { deleteHandler, getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.coach, "Coach");

export const PUT = updateHandler(prisma.coach, "Coach", (body) => ({
  firstName: body.firstName !== undefined ? String(body.firstName) : undefined,
  lastName: body.lastName !== undefined ? String(body.lastName) : undefined,
  email: body.email !== undefined ? String(body.email) : undefined,
  phone: body.phone !== undefined ? String(body.phone) : undefined,
}));

export const DELETE = deleteHandler(prisma.coach, "Coach");
