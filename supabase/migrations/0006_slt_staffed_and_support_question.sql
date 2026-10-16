-- 1) SLT members review only the PMs and SCs on projects they are staffed on
--    (previously an SLT member with no project reviewed every PM and SC).
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
      and p_evaluator in (select person_id from on_proj)
      and p_evaluatee in (select person_id from on_proj)
    else false end
$$;

-- 2) Optional short-answer question on every form.
alter table evaluations add column if not exists leadership_support text;

create or replace view responses with (security_invoker = true) as
select e.submitted_at as "Timestamp", er.full_name as "Evaluator Name", e.evaluator_role as "Evaluator Role",
       pr.name as "Project", ee.full_name as "Evaluatee Name", e.evaluatee_role as "Evaluatee Role",
       e.technical as "Technical", e.communication as "Communication", e.reliability as "Reliability",
       e.teamwork as "Teamwork", e.initiative as "Initiative", e.leadership as "Leadership",
       e.comment as "Comment", round(e.eval_avg, 2) as "Eval Avg", c.round as "Round", c.term as "Term",
       e.leadership_support as "Leadership Support"
from evaluations e
join people er on er.id = e.evaluator_id
join people ee on ee.id = e.evaluatee_id
join projects pr on pr.id = e.project_id
join cycles c on c.id = e.cycle_id;
