import { config } from "dotenv";
import { beforeEach } from "vitest";
import { prisma } from "@/lib/db";

config();

beforeEach(async () => {
  try {
    await prisma.classSignIn.deleteMany();
    await prisma.classReservation.deleteMany();
    await prisma.workoutResult.deleteMany();
    await prisma.workoutExercise.deleteMany();
    await prisma.class.deleteMany();
    await prisma.workoutSection.deleteMany();
    await prisma.workout.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.membershipTemplate.deleteMany();
    await prisma.discount.deleteMany();
    await prisma.client.deleteMany();
    await prisma.clientStatus.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.leadStatus.deleteMany();
  } catch (err) {
    console.warn("beforeEach: database unavailable, skipping cleanup", err);
  }
});
