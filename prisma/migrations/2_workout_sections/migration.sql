-- AlterTable: Workout gains program + scheduledDate
ALTER TABLE "Workout" ADD COLUMN "program" TEXT;
ALTER TABLE "Workout" ADD COLUMN "scheduledDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkoutSection" (
    "id" SERIAL NOT NULL,
    "workoutId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "prescription" TEXT,
    "videoUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutResult" (
    "id" SERIAL NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkoutSection" ADD CONSTRAINT "WorkoutSection_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "WorkoutSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutResult" ADD CONSTRAINT "WorkoutResult_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutResult" ADD CONSTRAINT "WorkoutResult_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
