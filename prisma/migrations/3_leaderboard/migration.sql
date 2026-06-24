-- AlterTable
ALTER TABLE "WorkoutResult" ADD COLUMN "score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN "scored" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkoutExercise" ADD COLUMN "unit" TEXT;
ALTER TABLE "WorkoutExercise" ADD COLUMN "sortDirection" TEXT NOT NULL DEFAULT 'desc';
