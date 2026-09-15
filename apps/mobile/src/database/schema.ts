import type { EntityType } from "@memocycle/contracts";
export const tables: Record<EntityType, string> = {
  subject: "subjects",
  module: "modules",
  course: "courses",
  exam: "exams",
  reviewPlan: "review_plans",
  reviewEvent: "review_events",
  userSettings: "user_settings",
};
const foreignKeys: Record<string, string> = {
  modules:
    ", FOREIGN KEY(owner_user_id,subject_id) REFERENCES subjects(owner_user_id,id) ON DELETE CASCADE",
  courses:
    ", FOREIGN KEY(owner_user_id,subject_id) REFERENCES subjects(owner_user_id,id) ON DELETE CASCADE, FOREIGN KEY(owner_user_id,module_id,subject_id) REFERENCES modules(owner_user_id,id,subject_id) ON DELETE CASCADE",
  exams:
    ", FOREIGN KEY(owner_user_id,subject_id) REFERENCES subjects(owner_user_id,id) ON DELETE CASCADE, FOREIGN KEY(owner_user_id,module_id,subject_id) REFERENCES modules(owner_user_id,id,subject_id) ON DELETE CASCADE",
  review_plans:
    ", FOREIGN KEY(owner_user_id,course_id) REFERENCES courses(owner_user_id,id) ON DELETE CASCADE",
  review_events:
    ", FOREIGN KEY(owner_user_id,course_id) REFERENCES courses(owner_user_id,id) ON DELETE CASCADE, FOREIGN KEY(owner_user_id,review_plan_id,course_id) REFERENCES review_plans(owner_user_id,id,course_id) ON DELETE CASCADE",
};
export const initialSchema =
  Object.values(tables)
    .map(
      (table) => `
CREATE TABLE ${table} (
 id TEXT NOT NULL, owner_user_id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
 version INTEGER NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
 sync_status TEXT NOT NULL CHECK(sync_status IN ('synced','pending','conflict')),
 subject_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.subjectId')) VIRTUAL,
 module_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.moduleId')) VIRTUAL,
 course_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.courseId')) VIRTUAL,
 review_plan_id TEXT GENERATED ALWAYS AS (json_extract(data,'$.reviewPlanId')) VIRTUAL,
 next_review_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.nextReviewAt')) VIRTUAL,
 completed_at TEXT GENERATED ALWAYS AS (json_extract(data,'$.completedAt')) VIRTUAL,
 PRIMARY KEY(owner_user_id,id), UNIQUE(owner_user_id,id,subject_id), UNIQUE(owner_user_id,id,course_id)
 ${foreignKeys[table] ?? ""}
);
CREATE INDEX ${table}_owner ON ${table}(owner_user_id);
`,
    )
    .join("\n") +
  `
CREATE INDEX courses_subject ON courses(owner_user_id,subject_id);
CREATE INDEX courses_module ON courses(owner_user_id,module_id);
CREATE INDEX plans_due ON review_plans(owner_user_id,next_review_at);
CREATE UNIQUE INDEX plans_course ON review_plans(owner_user_id,course_id);
CREATE INDEX events_course ON review_events(owner_user_id,course_id);
CREATE INDEX events_completed ON review_events(owner_user_id,completed_at);
CREATE UNIQUE INDEX events_step ON review_events(owner_user_id,json_extract(data,'$.reviewPlanId'),json_extract(data,'$.cycle'),json_extract(data,'$.stepIndex'));
CREATE TABLE sync_outbox (
 id TEXT PRIMARY KEY,owner_user_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,
 operation TEXT NOT NULL,base_version INTEGER,payload_json TEXT NOT NULL,created_at TEXT NOT NULL,
 retry_count INTEGER NOT NULL DEFAULT 0,last_error TEXT
);
CREATE INDEX outbox_owner ON sync_outbox(owner_user_id,created_at);
CREATE TABLE sync_metadata (owner_user_id TEXT PRIMARY KEY,cursor TEXT,last_synced_at TEXT);
CREATE TABLE server_shadow (owner_user_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(owner_user_id,entity_type,entity_id));
CREATE TABLE sync_conflicts (id TEXT PRIMARY KEY,owner_user_id TEXT NOT NULL,mutation_json TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE daily_progress (owner_user_id TEXT NOT NULL,day TEXT NOT NULL,initial_total INTEGER NOT NULL,PRIMARY KEY(owner_user_id,day));
`;
