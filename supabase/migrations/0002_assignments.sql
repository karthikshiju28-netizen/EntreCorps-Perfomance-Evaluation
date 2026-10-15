create or replace function can_evaluate(p_form text, p_evaluator uuid, p_evaluatee uuid, p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with er as (select role from people where id = p_evaluator and active),
       ee as (select role from people where id = p_evaluatee and active),
       on_proj as (select person_id from assignments where project_id = p_project)
  select case p_form
    when 'self' then p_evaluator = p_evaluatee
      and (select role from er) in ('Project Manager','Senior Consultant','Consultant')
      and p_evaluator in (select person_id from on_proj)
    when 'manager' then (select role from er) in ('Project Manager','Senior Consultant')
      and (select role from ee) = 'Consultant'
      and p_evaluator in (select person_id from on_proj)
      and p_evaluatee in (select person_id from on_proj)
    when 'upward' then ((select role from er) = 'Consultant'
        or ((select role from er) in ('Project Manager','Senior Consultant')
            and p_evaluator <> p_evaluatee
            and (select value from app_settings where key = 'pm_sc_peer_reviews') = 'true'))
      and (select role from ee) in ('Project Manager','Senior Consultant')
      and p_evaluator in (select person_id from on_proj)
      and p_evaluatee in (select person_id from on_proj)
    when 'slt' then (select role from er) = 'SLT'
      and (select role from ee) in ('Project Manager','Senior Consultant')
      and p_evaluatee in (select person_id from on_proj)
      and (not exists (select 1 from assignments where person_id = p_evaluator)
           or p_evaluator in (select person_id from on_proj))
    else false end
$$;
create or replace function my_tasks()
returns table (form_type text, project_id uuid, project_name text,
               evaluatee_id uuid, evaluatee_name text, evaluatee_role text,
               evaluation_id uuid, submitted_at timestamptz)
language sql stable security definer set search_path = public as $$
  with me as (select current_person_id() as id),
       cyc as (select id from cycles where is_open),
       pairs as (
         select f.form_type, a.project_id, p.id as evaluatee_id
         from (values ('self'),('manager'),('upward'),('slt')) f(form_type)
         cross join projects pr
         join assignments a on a.project_id = pr.id
         join people p on p.id = a.person_id and p.active
         where pr.active and can_evaluate(f.form_type, (select id from me), p.id, pr.id)
       )
  select pa.form_type, pa.project_id, pr.name, pa.evaluatee_id, pe.full_name, pe.role,
         e.id, e.submitted_at
  from pairs pa
  join projects pr on pr.id = pa.project_id
  join people pe on pe.id = pa.evaluatee_id
  left join evaluations e on e.cycle_id = (select id from cyc)
    and e.form_type = pa.form_type and e.evaluator_id = (select id from me)
    and e.evaluatee_id = pa.evaluatee_id and e.project_id = pa.project_id
  where exists (select 1 from cyc)
  order by case pa.form_type when 'self' then 0 when 'manager' then 1 when 'upward' then 2 else 3 end,
           pr.sort_order, pe.full_name
$$;

-- Snapshot roles and enforce the Leadership rules on every insert/update.
create or replace function evaluations_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select role into new.evaluator_role from people where id = new.evaluator_id;
  select role into new.evaluatee_role from people where id = new.evaluatee_id;
  new.updated_at := now();
  if new.form_type = 'manager' and new.leadership is not null then
    raise exception 'Manager evaluations have no Leadership score';
  end if;
  if new.form_type in ('upward','slt') and new.leadership is null then
    raise exception 'Leadership & Mentorship is required on Upward and SLT evaluations';
  end if;
  if new.form_type = 'self' and new.leadership is not null
     and new.evaluator_role not in ('Project Manager','Senior Consultant') then
    raise exception 'Only PMs and SCs answer Leadership on the self-evaluation';
  end if;
  return new;
end $$;

create trigger evaluations_before_write before insert or update on evaluations
  for each row execute function evaluations_before_write();
