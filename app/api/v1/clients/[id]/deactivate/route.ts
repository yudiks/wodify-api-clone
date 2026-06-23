import { prisma } from "@/lib/db";
import { toggleHandler } from "@/lib/crud";

export const PUT = toggleHandler(prisma.client, "Client", { isActive: false });
