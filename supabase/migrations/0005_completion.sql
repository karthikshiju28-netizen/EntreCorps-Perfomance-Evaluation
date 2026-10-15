-- Every evaluation owed in a cycle (same pairing logic as my_tasks), with done / not done. SLT only.
create or replace function completion_status(p_cycle uuid)
returns table (evaluator_id uuid, evaluator_name text, evaluator_email text, form_type text,
               project_id uuid, project_name text, evaluatee_id uuid, evaluatee_name text, done boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_slt() then raise exception 'SLT only'; end if;
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
