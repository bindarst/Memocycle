-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr-BE',
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "sync_sequence" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "email_at_auth" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "installation_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_name" TEXT,
    "app_version" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_refresh_tokens" (
    "id" UUID NOT NULL,
    "hash" TEXT NOT NULL,
    "session_id" UUID NOT NULL,

    CONSTRAINT "used_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_key" TEXT,
    "color_key" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "module_id" UUID,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "estimated_review_minutes" INTEGER NOT NULL DEFAULT 10,
    "importance" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "studied_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "module_id" UUID,
    "title" VARCHAR(100) NOT NULL,
    "exam_at" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "scheduler_type" TEXT NOT NULL DEFAULT 'classic',
    "schedule_version" INTEGER NOT NULL DEFAULT 1,
    "intervals_json" JSONB NOT NULL,
    "current_step" INTEGER NOT NULL,
    "next_review_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL,
    "last_reviewed_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "review_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "review_plan_id" UUID NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "kind" TEXT NOT NULL,
    "step_index" INTEGER,
    "scheduled_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ NOT NULL,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "device_id" UUID,
    "confidence" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "daily_study_minutes" INTEGER,
    "reminders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "vibration_enabled" BOOLEAN NOT NULL DEFAULT true,
    "morning_summary" BOOLEAN NOT NULL DEFAULT false,
    "appearance" TEXT NOT NULL DEFAULT 'system',
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_mutations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_mutation_id" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_mutations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_changes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sync_seq" BIGINT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key" ON "auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "devices_user_id_installation_id_key" ON "devices"("user_id", "installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "used_refresh_tokens_hash_key" ON "used_refresh_tokens"("hash");

-- CreateIndex
CREATE INDEX "subjects_user_id_updated_at_idx" ON "subjects"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_id_user_id_key" ON "subjects"("id", "user_id");

-- CreateIndex
CREATE INDEX "modules_user_id_updated_at_idx" ON "modules"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "modules_subject_id_idx" ON "modules"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "modules_id_subject_id_user_id_key" ON "modules"("id", "subject_id", "user_id");

-- CreateIndex
CREATE INDEX "courses_user_id_updated_at_idx" ON "courses"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "courses_subject_id_idx" ON "courses"("subject_id");

-- CreateIndex
CREATE INDEX "courses_module_id_idx" ON "courses"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_id_user_id_key" ON "courses"("id", "user_id");

-- CreateIndex
CREATE INDEX "exams_user_id_updated_at_idx" ON "exams"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "exams_subject_id_idx" ON "exams"("subject_id");

-- CreateIndex
CREATE INDEX "exams_module_id_idx" ON "exams"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_plans_course_id_key" ON "review_plans"("course_id");

-- CreateIndex
CREATE INDEX "review_plans_user_id_updated_at_idx" ON "review_plans"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "review_plans_next_review_at_idx" ON "review_plans"("next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_plans_id_course_id_user_id_key" ON "review_plans"("id", "course_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_plans_course_id_user_id_key" ON "review_plans"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "review_events_user_id_updated_at_idx" ON "review_events"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "review_events_course_id_idx" ON "review_events"("course_id");

-- CreateIndex
CREATE INDEX "review_events_completed_at_idx" ON "review_events"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_events_review_plan_id_cycle_step_index_key" ON "review_events"("review_plan_id", "cycle", "step_index");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "processed_mutations_client_mutation_id_key" ON "processed_mutations"("client_mutation_id");

-- CreateIndex
CREATE INDEX "processed_mutations_user_id_idx" ON "processed_mutations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_changes_user_id_sync_seq_key" ON "sync_changes"("user_id", "sync_seq");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "used_refresh_tokens" ADD CONSTRAINT "used_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_subject_id_user_id_fkey" FOREIGN KEY ("subject_id", "user_id") REFERENCES "subjects"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_subject_id_user_id_fkey" FOREIGN KEY ("subject_id", "user_id") REFERENCES "subjects"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_module_id_subject_id_user_id_fkey" FOREIGN KEY ("module_id", "subject_id", "user_id") REFERENCES "modules"("id", "subject_id", "user_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_user_id_fkey" FOREIGN KEY ("subject_id", "user_id") REFERENCES "subjects"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_module_id_subject_id_user_id_fkey" FOREIGN KEY ("module_id", "subject_id", "user_id") REFERENCES "modules"("id", "subject_id", "user_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_plans" ADD CONSTRAINT "review_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_plans" ADD CONSTRAINT "review_plans_course_id_user_id_fkey" FOREIGN KEY ("course_id", "user_id") REFERENCES "courses"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_course_id_user_id_fkey" FOREIGN KEY ("course_id", "user_id") REFERENCES "courses"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_review_plan_id_course_id_user_id_fkey" FOREIGN KEY ("review_plan_id", "course_id", "user_id") REFERENCES "review_plans"("id", "course_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processed_mutations" ADD CONSTRAINT "processed_mutations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_changes" ADD CONSTRAINT "sync_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
