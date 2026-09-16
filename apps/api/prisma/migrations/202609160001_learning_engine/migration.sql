-- AlterTable review_plans
ALTER TABLE "review_plans" ADD COLUMN "desired_retention" DOUBLE PRECISION NOT NULL DEFAULT 0.90;
ALTER TABLE "review_plans" ADD COLUMN "difficulty" DOUBLE PRECISION;
ALTER TABLE "review_plans" ADD COLUMN "stability" DOUBLE PRECISION;
ALTER TABLE "review_plans" ADD COLUMN "retrievability" DOUBLE PRECISION;
ALTER TABLE "review_plans" ADD COLUMN "scheduled_days" INTEGER;
ALTER TABLE "review_plans" ADD COLUMN "elapsed_days" INTEGER;
ALTER TABLE "review_plans" ADD COLUMN "reps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "review_plans" ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "review_plans" ADD COLUMN "last_rating" TEXT;

-- CreateTable study_items
CREATE TABLE "study_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "front" TEXT,
    "back" TEXT,
    "hint" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "study_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_items_user_id_updated_at_idx" ON "study_items"("user_id", "updated_at");
CREATE INDEX "study_items_course_id_idx" ON "study_items"("course_id");
CREATE UNIQUE INDEX "study_items_id_user_id_key" ON "study_items"("id", "user_id");

-- AddForeignKey
ALTER TABLE "study_items" ADD CONSTRAINT "study_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_items" ADD CONSTRAINT "study_items_course_id_user_id_fkey" FOREIGN KEY ("course_id", "user_id") REFERENCES "courses"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints
ALTER TABLE "study_items" ADD CONSTRAINT "study_items_type" CHECK (type IN ('flashcard', 'question', 'cloze', 'note'));
ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "settings_minutes";
ALTER TABLE "user_settings" ADD CONSTRAINT "settings_minutes" CHECK (daily_study_minutes IS NULL OR daily_study_minutes IN (15, 30, 45, 60, 90, 120));
