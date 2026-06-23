import { prisma } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.workout, "Workout", { createdDate: "desc" });

export const POST = createHandler(prisma.workout, "Workout", (body) => {
  if (!body.name) throw new Error("name is required");
  return {
    name: String(body.name),
    description: body.description ? String(body.description) : undefined,
    type: body.type ? String(body.type) : undefined,
    components: body.components ? String(body.components) : undefined,
  };
});
