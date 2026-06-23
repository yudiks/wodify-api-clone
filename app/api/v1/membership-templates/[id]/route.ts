import { prisma } from "@/lib/db";
import { deleteHandler, getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.membershipTemplate, "MembershipTemplate");

export const PUT = updateHandler(prisma.membershipTemplate, "MembershipTemplate", (body) => ({
  name: body.name !== undefined ? String(body.name) : undefined,
  description: body.description !== undefined ? String(body.description) : undefined,
  price: body.price !== undefined ? Number(body.price) : undefined,
}));

export const DELETE = deleteHandler(prisma.membershipTemplate, "MembershipTemplate");
