-- "Slide Design (1-5)": required on evaluations ABOUT a consultant (their Self form and Manager reviews).
-- Counts toward Eval Avg like the other scores.
alter table evaluations add column if not exists slide_design smallint check (slide_design between 1 and 5);

alter table evaluations alter column eval_avg set expression as (
  (technical + communication + reliability + teamwork + initiative
     + coalesce(leadership, 0) + coalesce(slide_design, 0))::numeric
  / (5 + case when leadership is null then 0 else 1 end + case when slide_design is null then 0 else 1 end)
);

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
  if new.form_type in ('self','manager') and new.evaluatee_role = 'Consultant' then
    if new.slide_design is null then
      raise exception 'Slide Design is required when evaluating a consultant';
    end if;
  elsif new.slide_design is not null then
    raise exception 'Slide Design is only rated for consultants';
  end if;
  return new;
end $$;

create or replace view responses with (security_invoker = true) as
select e.submitted_at as "Timestamp", er.full_name as "Evaluator Name", e.evaluator_role as "Evaluator Role",
       pr.name as "Project", ee.full_name as "Evaluatee Name", e.evaluatee_role as "Evaluatee Role",
       e.technical as "Technical", e.communication as "Communication", e.reliability as "Reliability",
       e.teamwork as "Teamwork", e.initiative as "Initiative", e.leadership as "Leadership",
       e.comment as "Comment", round(e.eval_avg, 2) as "Eval Avg", c.round as "Round", c.term as "Term",
       e.leadership_support as "Leadership Support", e.slide_design as "Slide Design"
from evaluations e
join people er on er.id = e.evaluator_id
join people ee on ee.id = e.evaluatee_id
join projects pr on pr.id = e.project_id
join cycles c on c.id = e.cycle_id;

drop function if exists project_consultant_reviews(uuid);
create function project_consultant_reviews(p_cycle uuid)
returns table (project_id uuid, evaluatee_id uuid, form_type text, evaluator_name text, evaluator_role text,
               technical smallint, communication smallint, reliability smallint, teamwork smallint, initiative smallint,
               slide_design smallint, eval_avg numeric, comment text, submitted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.project_id, e.evaluatee_id, e.form_type, er.full_name, e.evaluator_role,
         e.technical, e.communication, e.reliability, e.teamwork, e.initiative, e.slide_design,
         round(e.eval_avg, 2), e.comment, e.submitted_at
  from evaluations e
  join people er on er.id = e.evaluator_id
  join people ee on ee.id = e.evaluatee_id
  where e.cycle_id = p_cycle and e.form_type in ('self','manager') and ee.role = 'Consultant'
    and e.project_id in (select my_led_projects())
  order by e.submitted_at
$$;
