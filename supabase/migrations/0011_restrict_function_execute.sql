-- Hardening from the Supabase security advisor: signed-out visitors (anon) can no longer call
-- data-returning functions over the API. (They already returned nothing for anon; this removes the door.)
-- current_person_id / is_slt / can_view_dashboard stay callable because row-level security policies use them.
revoke execute on function completion_status(uuid) from anon, public;
revoke execute on function my_tasks() from anon, public;
revoke execute on function my_upward_feedback(uuid) from anon, public;
revoke execute on function project_consultant_scores(uuid) from anon, public;
revoke execute on function project_consultant_reviews(uuid) from anon, public;
revoke execute on function current_or_latest_cycle() from anon, public;
revoke execute on function my_led_projects() from anon, public;
revoke execute on function can_evaluate(text, uuid, uuid, uuid) from anon, public;
revoke execute on function person_scores(text, text) from anon, public;
-- Trigger function: never needs to be called directly.
revoke execute on function evaluations_before_write() from anon, authenticated, public;
-- Make sure signed-in users keep what the app uses.
grant execute on function completion_status(uuid), my_tasks(), my_upward_feedback(uuid),
  project_consultant_scores(uuid), project_consultant_reviews(uuid), current_or_latest_cycle(),
  my_led_projects(), can_evaluate(text, uuid, uuid, uuid), person_scores(text, text) to authenticated;
