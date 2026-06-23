import { prisma } from "@/lib/db";
import { getByIdHandler } from "@/lib/crud";

export const GET = getByIdHandler(prisma.class, "Class");
