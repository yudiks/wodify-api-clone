-- AlterTable: add passwordHash and make email unique on Client
ALTER TABLE "Client" ADD COLUMN "passwordHash" TEXT;
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
