alter table projects enable row level security;
alter table people enable row level security;
alter table person_emails enable row level security;
alter table assignments enable row level security;
alter table cycles enable row level security;
alter table evaluations enable row level security;
alter table weights enable row level security;
alter table app_settings enable row level security;

-- Roster data: any registered member can read names, roles, projects (needed for to-do lists).
create policy read_projects on projects for select using (current_person_id() is not null);
create policy read_people on people for select using (current_person_id() is not null);
create policy read_assignments on assignments for select using (current_person_id() is not null);
create policy read_cycles on cycles for select using (current_person_id() is not null);
create policy read_own_email on person_emails for select using (person_id = current_person_id() or is_slt());

-- Evaluations: you see only what you wrote; SLT sees everything.
create policy read_evals on evaluations for select
  using (evaluator_id = current_person_id() or is_slt());

create policy insert_evals on evaluations for insert
  with check (
    evaluator_id = current_person_id()
    and exists (select 1 from cycles c where c.id = cycle_id and c.is_open)
    and can_evaluate(form_type, evaluator_id, evaluatee_id, project_id)   -- Section 5
  );

create policy update_evals on evaluations for update
  using (evaluator_id = current_person_id()
         and exists (select 1 from cycles c where c.id = cycle_id and c.is_open)
         and (select value from app_settings where key = 'allow_edits_until_close') = 'true')
  with check (evaluator_id = current_person_id());

-- SLT-only writes
create policy slt_write_people on people for all using (is_slt()) with check (is_slt());
create policy slt_write_emails on person_emails for all using (is_slt()) with check (is_slt());
create policy slt_write_assign on assignments for all using (is_slt()) with check (is_slt());
create policy slt_write_projects on projects for all using (is_slt()) with check (is_slt());
create policy slt_write_cycles on cycles for all using (is_slt()) with check (is_slt());
create policy slt_delete_evals on evaluations for delete using (is_slt());
create policy slt_weights on weights for all using (is_slt()) with check (is_slt());
create policy slt_settings on app_settings for all using (is_slt()) with check (is_slt());
create policy read_settings on app_settings for select using (true);   -- login page needs the domain
