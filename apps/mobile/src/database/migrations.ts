import type { SQLiteDatabase } from "expo-sqlite";
import { initialSchema } from "./schema";
const migrations = [
  initialSchema,
  `
  ALTER TABLE server_shadow ADD COLUMN needs_apply INTEGER NOT NULL DEFAULT 1;
  CREATE UNIQUE INDEX IF NOT EXISTS modules_owner_subject ON modules(owner_user_id,id,subject_id);
  CREATE UNIQUE INDEX IF NOT EXISTS plans_owner_course ON review_plans(owner_user_id,id,course_id);

  CREATE TRIGGER IF NOT EXISTS modules_parent_insert BEFORE INSERT ON modules
  WHEN NEW.subject_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM subjects WHERE owner_user_id=NEW.owner_user_id AND id=NEW.subject_id)
  BEGIN SELECT RAISE(ABORT,'subject not found'); END;
  CREATE TRIGGER IF NOT EXISTS courses_parents_insert BEFORE INSERT ON courses
  WHEN NOT EXISTS(SELECT 1 FROM subjects WHERE owner_user_id=NEW.owner_user_id AND id=NEW.subject_id)
    OR (NEW.module_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM modules WHERE owner_user_id=NEW.owner_user_id AND id=NEW.module_id AND subject_id=NEW.subject_id))
  BEGIN SELECT RAISE(ABORT,'course parent not found'); END;
  CREATE TRIGGER IF NOT EXISTS exams_parents_insert BEFORE INSERT ON exams
  WHEN NOT EXISTS(SELECT 1 FROM subjects WHERE owner_user_id=NEW.owner_user_id AND id=NEW.subject_id)
    OR (NEW.module_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM modules WHERE owner_user_id=NEW.owner_user_id AND id=NEW.module_id AND subject_id=NEW.subject_id))
  BEGIN SELECT RAISE(ABORT,'exam parent not found'); END;
  CREATE TRIGGER IF NOT EXISTS plans_course_insert BEFORE INSERT ON review_plans
  WHEN NOT EXISTS(SELECT 1 FROM courses WHERE owner_user_id=NEW.owner_user_id AND id=NEW.course_id)
  BEGIN SELECT RAISE(ABORT,'course not found'); END;
  CREATE TRIGGER IF NOT EXISTS events_plan_insert BEFORE INSERT ON review_events
  WHEN NOT EXISTS(SELECT 1 FROM review_plans WHERE owner_user_id=NEW.owner_user_id AND id=NEW.review_plan_id AND course_id=NEW.course_id)
  BEGIN SELECT RAISE(ABORT,'review plan not found'); END;

  CREATE TRIGGER IF NOT EXISTS subjects_children_delete AFTER DELETE ON subjects BEGIN
    DELETE FROM exams WHERE owner_user_id=OLD.owner_user_id AND subject_id=OLD.id;
    DELETE FROM courses WHERE owner_user_id=OLD.owner_user_id AND subject_id=OLD.id;
    DELETE FROM modules WHERE owner_user_id=OLD.owner_user_id AND subject_id=OLD.id;
  END;
  CREATE TRIGGER IF NOT EXISTS modules_children_delete AFTER DELETE ON modules BEGIN
    DELETE FROM exams WHERE owner_user_id=OLD.owner_user_id AND module_id=OLD.id;
    DELETE FROM courses WHERE owner_user_id=OLD.owner_user_id AND module_id=OLD.id;
  END;
  CREATE TRIGGER IF NOT EXISTS courses_children_delete AFTER DELETE ON courses BEGIN
    DELETE FROM review_events WHERE owner_user_id=OLD.owner_user_id AND course_id=OLD.id;
    DELETE FROM review_plans WHERE owner_user_id=OLD.owner_user_id AND course_id=OLD.id;
  END;
  CREATE TRIGGER IF NOT EXISTS plans_events_delete AFTER DELETE ON review_plans BEGIN
    DELETE FROM review_events WHERE owner_user_id=OLD.owner_user_id AND review_plan_id=OLD.id;
  END;
  `,
  `
  CREATE TABLE IF NOT EXISTS study_items (
   id TEXT NOT NULL, owner_user_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
   version INTEGER NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
   sync_status TEXT NOT NULL CHECK(sync_status IN ('synced','pending','conflict')),
   subject_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.subjectId')) VIRTUAL,
   module_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.moduleId')) VIRTUAL,
   course_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.courseId')) VIRTUAL,
   review_plan_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.reviewPlanId')) VIRTUAL,
   next_review_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.nextReviewAt')) VIRTUAL,
   completed_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.completedAt')) VIRTUAL,
   PRIMARY KEY(owner_user_id,id), UNIQUE(owner_user_id,id,course_id),
   FOREIGN KEY(owner_user_id,course_id) REFERENCES courses(owner_user_id,id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS study_items_owner ON study_items(owner_user_id);
  CREATE INDEX IF NOT EXISTS study_items_course ON study_items(owner_user_id,course_id);

  CREATE TRIGGER IF NOT EXISTS study_items_course_insert BEFORE INSERT ON study_items
  WHEN NOT EXISTS(SELECT 1 FROM courses WHERE owner_user_id=NEW.owner_user_id AND id=NEW.course_id)
  BEGIN SELECT RAISE(ABORT,'course not found'); END;

  CREATE TRIGGER IF NOT EXISTS courses_study_items_delete AFTER DELETE ON courses BEGIN
    DELETE FROM study_items WHERE owner_user_id=OLD.owner_user_id AND course_id=OLD.id;
  END;
  `,
  `
  CREATE TABLE IF NOT EXISTS study_sessions (
   id TEXT NOT NULL, owner_user_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
   version INTEGER NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
   sync_status TEXT NOT NULL CHECK(sync_status IN ('synced','pending','conflict')),
   subject_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.subjectId')) VIRTUAL,
   module_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.moduleId')) VIRTUAL,
   course_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.courseId')) VIRTUAL,
   review_plan_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.reviewPlanId')) VIRTUAL,
   next_review_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.nextReviewAt')) VIRTUAL,
   completed_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.completedAt')) VIRTUAL,
   planned_start_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.plannedStartAt')) VIRTUAL,
   PRIMARY KEY(owner_user_id,id), UNIQUE(owner_user_id,id,course_id),
   FOREIGN KEY(owner_user_id,course_id) REFERENCES courses(owner_user_id,id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS study_sessions_owner ON study_sessions(owner_user_id);
  CREATE INDEX IF NOT EXISTS study_sessions_course ON study_sessions(owner_user_id,course_id);
  CREATE INDEX IF NOT EXISTS study_sessions_planned ON study_sessions(owner_user_id,planned_start_at);

  CREATE TRIGGER IF NOT EXISTS study_sessions_course_insert BEFORE INSERT ON study_sessions
  WHEN NOT EXISTS(SELECT 1 FROM courses WHERE owner_user_id=NEW.owner_user_id AND id=NEW.course_id)
  BEGIN SELECT RAISE(ABORT,'course not found'); END;

  CREATE TRIGGER IF NOT EXISTS courses_study_sessions_delete AFTER DELETE ON courses BEGIN
    DELETE FROM study_sessions WHERE owner_user_id=OLD.owner_user_id AND course_id=OLD.id;
  END;
  `,
  `
  CREATE TABLE IF NOT EXISTS study_timers (
    owner_user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('focus','chronometer')),
    focus_minutes INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    running_since_ms INTEGER,
    PRIMARY KEY(owner_user_id,course_id),
    FOREIGN KEY(owner_user_id,course_id) REFERENCES courses(owner_user_id,id) ON DELETE CASCADE
  );
  `,
];
export async function migrate(db: SQLiteDatabase) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    const version = row?.user_version ?? 0;
    if (version > migrations.length)
      throw new Error("Mets MémoCycle à jour pour ouvrir ces données.");
    for (let index = version; index < migrations.length; index++) {
      await tx.execAsync(migrations[index]!);
      await tx.execAsync(`PRAGMA user_version = ${index + 1}`);
    }
  });
}
