import { prisma } from "@/lib/db";
import { listHandler } from "@/lib/crud";

export const GET = listHandler(prisma.classReservation, "ClassReservation");
