import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { listHandler } from "@/lib/crud";
import { badRequest, jsonCreated } from "@/lib/http";

export const GET = listHandler(prisma.client, "Client");

export const POST = async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object");

  const { firstName, lastName, email, phone, statusId, membershipTemplateId } = body as Record<string, unknown>;

  if (!firstName || !lastName) {
    return badRequest("firstName and lastName are required");
  }

  const clientData = {
    firstName: String(firstName),
    lastName: String(lastName),
    email: email ? String(email) : undefined,
    phone: phone ? String(phone) : undefined,
    statusId: statusId ? Number(statusId) : undefined,
  };

  let templateId: number | undefined;
  if (membershipTemplateId !== undefined && membershipTemplateId !== null && membershipTemplateId !== "") {
    templateId = Number(membershipTemplateId);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return badRequest("membershipTemplateId must be a valid id");
    }
  }

  try {
    if (templateId !== undefined) {
      const created = await prisma.$transaction(async (tx) => {
        const template = await tx.membershipTemplate.findUnique({ where: { id: templateId } });
        if (!template) {
          throw new Error("Membership template not found");
        }
        const client = await tx.client.create({ data: clientData });
        await tx.membership.create({
          data: {
            clientId: client.id,
            templateId: templateId as number,
          },
        });
        return client;
      });
      return jsonCreated(created);
    }

    const client = await prisma.client.create({ data: clientData });
    return jsonCreated(client);
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Could not create Client");
  }
};
