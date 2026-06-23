import { prisma } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.class, "Class", { startDateTime: "asc" });

export const POST = createHandler(prisma.class, "Class", (body) => {
  if (!body.name || !body.startDateTime || !body.endDateTime) {
    throw new Error("name, startDateTime and endDateTime are required");
  }
  return {
    name: String(body.name),
    program: body.program ? String(body.program) : undefined,
    startDateTime: new Date(String(body.startDateTime)),
    endDateTime: new Date(String(body.endDateTime)),
    capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
    location: body.location ? String(body.location) : undefined,
  };
});
