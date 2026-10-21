-- External Leads (Gabe, Manu) can VIEW the full SLT Dashboard (all scores, comments, completion),
-- but cannot change anything: every write policy still requires is_slt().
create or replace function can_view_dashboard() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = current_person_id() and active and role in ('SLT','External Lead'))
$$;

drop policy if exists read_evals on evaluations;
create policy read_evals on evaluations for select
  using (evaluator_id = current_person_id() or can_view_dashboard());

-- person_scores (security invoker) needs to read the weights to compute composites.
drop policy if exists read_weights on weights;
create policy read_weights on weights for select using (can_view_dashboard());

create or replace function completion_status(p_cycle uuid)
returns table (evaluator_id uuid, evaluator_name text, evaluator_email text, form_type text,
               project_id uuid, project_name text, evaluatee_id uuid, evaluatee_name text, done boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not can_view_dashboard() then raise exception 'SLT only'; end if;
  return query
  select ev.id, ev.full_name,
         (select pe.email::text from person_emails pe where pe.person_id = ev.id order by pe.email limit 1),
         f.form_type, pr.id, pr.name, ee.id, ee.full_name,
         exists (select 1 from evaluations e
                 where e.cycle_id = p_cycle and e.form_type = f.form_type and e.evaluator_id = ev.id
                   and e.evaluatee_id = ee.id and e.project_id = pr.id)
  from people ev
  cross join (values ('self'),('manager'),('upward'),('slt')) f(form_type)
  cross join projects pr
  join assignments a on a.project_id = pr.id
  join people ee on ee.id = a.person_id and ee.active
  where ev.active and pr.active and can_evaluate(f.form_type, ev.id, ee.id, pr.id);
end $$;
