import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MEMBER_PORTAL_PASSWORD = "password123";

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
      passwordHash: await hashPassword(MEMBER_PORTAL_PASSWORD),
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

  // Spread a week's worth of classes across the next 7 days so the portal's
  // weekly calendar has something to show: CrossFit WODs on weekday mornings
  // and evenings, plus weekend Open Gym.
  function atOffset(daysFromNow: number, hour: number, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  const weekClasses = [
    { day: 0, hour: 6, name: "CrossFit WOD", program: "CrossFit", capacity: 12 },
    { day: 0, hour: 17, name: "CrossFit WOD", program: "CrossFit", capacity: 12 },
    { day: 1, hour: 6, name: "CrossFit WOD", program: "CrossFit", capacity: 12 },
    { day: 1, hour: 9, name: "Olympic Lifting", program: "Weightlifting", capacity: 8 },
    { day: 2, hour: 17, name: "CrossFit WOD", program: "CrossFit", capacity: 1 },
    { day: 3, hour: 6, name: "CrossFit WOD", program: "CrossFit", capacity: 12 },
    { day: 3, hour: 18, name: "Endurance", program: "Conditioning", capacity: 10 },
    { day: 4, hour: 9, name: "CrossFit WOD", program: "CrossFit", capacity: 12 },
    { day: 5, hour: 10, name: "Open Gym", program: "CrossFit", capacity: 20 },
    { day: 6, hour: 11, name: "Yoga & Mobility", program: "Recovery", capacity: 15 },
  ];

  const createdClasses = [];
  for (const { day, hour, name, program, capacity } of weekClasses) {
    createdClasses.push(
      await prisma.class.create({
        data: {
          name,
          program,
          startDateTime: atOffset(day, hour),
          endDateTime: atOffset(day, hour + 1),
          capacity,
          location: "Main Floor",
        },
      })
    );
  }

  // Reserve Morgan into the first class of the week, and fill the
  // capacity-1 class so the portal demonstrates the waitlist state.
  await prisma.classReservation.create({
    data: { classId: createdClasses[0].id, clientId: client.id, status: "Reserved" },
  });

  const fullClass = createdClasses.find((c) => c.capacity === 1)!;
  const otherClient = await prisma.client.create({
    data: { firstName: "Jordan", lastName: "Lee", statusId: clientActive.id },
  });
  await prisma.classReservation.create({
    data: { classId: fullClass.id, clientId: otherClient.id, status: "Reserved" },
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
  console.log(`Member Portal login: ${client.email} / ${MEMBER_PORTAL_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
