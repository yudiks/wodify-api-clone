import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [leadNew, leadHot] = await Promise.all([
    prisma.leadStatus.upsert({ where: { name: "New" }, update: {}, create: { name: "New" } }),
    prisma.leadStatus.upsert({ where: { name: "Hot" }, update: {}, create: { name: "Hot" } }),
  ]);

  const [clientActive] = await Promise.all([
    prisma.clientStatus.upsert({ where: { name: "Active" }, update: {}, create: { name: "Active" } }),
  ]);

  await prisma.lead.createMany({
    data: [
      { firstName: "Alex", lastName: "Rivera", email: "alex@example.com", source: "Website", statusId: leadNew.id },
      { firstName: "Jamie", lastName: "Chen", email: "jamie@example.com", source: "Referral", statusId: leadHot.id },
    ],
  });

  const client = await prisma.client.create({
    data: {
      firstName: "Morgan",
      lastName: "Taylor",
      email: "morgan@example.com",
      statusId: clientActive.id,
    },
  });

  const template = await prisma.membershipTemplate.create({
    data: { name: "Unlimited Monthly", description: "Unlimited classes, billed monthly", price: 149.0 },
  });

  await prisma.membership.create({
    data: { clientId: client.id, templateId: template.id },
  });

  const invoice = await prisma.invoice.create({
    data: { clientId: client.id, amount: 149.0, status: "Paid" },
  });

  await prisma.transaction.create({
    data: { invoiceId: invoice.id, amount: 149.0, method: "Card", status: "Completed" },
  });

  await prisma.discount.create({
    data: { name: "New Member 10%", type: "Percent", value: 10 },
  });

  const klass = await prisma.class.create({
    data: {
      name: "CrossFit WOD",
      program: "CrossFit",
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      capacity: 12,
      location: "Main Floor",
    },
  });

  await prisma.classReservation.create({
    data: { classId: klass.id, clientId: client.id, status: "Reserved" },
  });

  await prisma.workout.create({
    data: {
      name: "Fran",
      description: "21-15-9 Thrusters & Pull-ups",
      type: "For Time",
      components: "Thrusters 95lb, Pull-ups",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
