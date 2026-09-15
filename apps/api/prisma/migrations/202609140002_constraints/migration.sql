ALTER TABLE users ADD CONSTRAINT users_status CHECK (status IN ('active','suspended','deletion_pending','deleted'));
ALTER TABLE users ADD CONSTRAINT users_tier CHECK (subscription_tier IN ('free','pro'));
ALTER TABLE auth_identities ADD CONSTRAINT identity_provider CHECK (provider IN ('google','apple'));
ALTER TABLE courses ADD CONSTRAINT courses_importance CHECK (importance BETWEEN 1 AND 3);
ALTER TABLE courses ADD CONSTRAINT courses_minutes CHECK (estimated_review_minutes BETWEEN 1 AND 600);
ALTER TABLE courses ADD CONSTRAINT courses_status CHECK (status IN ('draft','active','completed','archived'));
ALTER TABLE subjects ADD CONSTRAINT subjects_color CHECK (color_key IS NULL OR color_key IN ('blue','green','amber','slate'));
ALTER TABLE review_plans ADD CONSTRAINT plans_step CHECK (current_step BETWEEN 1 AND 6);
ALTER TABLE review_plans ADD CONSTRAINT plans_interval_array CHECK (jsonb_typeof(intervals_json) = 'array');
ALTER TABLE review_events ADD CONSTRAINT events_step_kind CHECK (
 (kind='review_completed' AND step_index BETWEEN 1 AND 6) OR
 (kind IN ('initial_study','schedule_restarted') AND step_index IS NULL)
);
ALTER TABLE review_events ADD CONSTRAINT events_delay CHECK (delay_minutes >= 0);
ALTER TABLE user_settings ADD CONSTRAINT settings_minutes CHECK (daily_study_minutes IS NULL OR daily_study_minutes IN (15,30,45,60));
CREATE FUNCTION prevent_review_event_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'review_events are immutable'; END;
$$;
CREATE TRIGGER immutable_review_events BEFORE UPDATE ON review_events FOR EACH ROW EXECUTE FUNCTION prevent_review_event_rewrite();
