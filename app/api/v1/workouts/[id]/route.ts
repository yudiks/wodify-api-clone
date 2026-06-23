import { prisma } from "@/lib/db";
import { deleteHandler, getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.workout, "Workout");

export const PUT = updateHandler(prisma.workout, "Workout", (body) => ({
  name: body.name !== undefined ? String(body.name) : undefined,
  description: body.description !== undefined ? String(body.description) : undefined,
  type: body.type !== undefined ? String(body.type) : undefined,
  components: body.components !== undefined ? String(body.components) : undefined,
}));

export const DELETE = deleteHandler(prisma.workout, "Workout");
