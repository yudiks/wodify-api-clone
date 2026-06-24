import { prisma } from "@/lib/db";
import { getByIdHandler, updateHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.class, "Class");

export const PUT = updateHandler(prisma.class, "Class", (body) => ({
  name: body.name !== undefined ? String(body.name) : undefined,
  program: body.program !== undefined ? String(body.program) : undefined,
  startDateTime: body.startDateTime !== undefined ? new Date(String(body.startDateTime)) : undefined,
  endDateTime: body.endDateTime !== undefined ? new Date(String(body.endDateTime)) : undefined,
  capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
  location: body.location !== undefined ? String(body.location) : undefined,
  coachId:
    body.coachId === undefined
      ? undefined
      : body.coachId === null || body.coachId === ""
        ? null
        : Number(body.coachId),
}));
