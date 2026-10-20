-- "External Lead": leads from a client office (e.g. Origin Ventures) who write Manager reviews for the
-- consultants on their project, but are not EntreCorps members: no self-eval, no peer reviews, not
-- reviewed by anyone, and not shown in scores. Their reviews count toward consultants' Manager score.
alter table people drop constraint if exists people_role_check;
alter table people add constraint people_role_check
  check (role in ('Project Manager','Senior Consultant','Consultant','SLT','External Lead'));

create or replace function can_evaluate(p_form text, p_evaluator uuid, p_evaluatee uuid, p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with er as (select role from people where id = p_evaluator and active),
       ee as (select role from people where id = p_evaluatee and active),
       on_proj as (select person_id from assignments where project_id = p_project)
  select case p_form
    when 'self' then p_evaluator = p_evaluatee
      and (select role from er) in ('Project Manager','Senior Consultant','Consultant')
      and p_evaluator in (select person_id from on_proj)
    when 'manager' then (select role from er) in ('Project Manager','Senior Consultant','External Lead')
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

create or replace function person_scores(p_term text, p_round text default 'All Rounds')
returns table (person_id uuid, full_name text, role text, projects text,
               self_score numeric, manager_score numeric, upward_score numeric, slt_score numeric,
               n_evals bigint, composite numeric)
language sql stable security invoker set search_path = public as $$
  with f as (
    select e.* from evaluations e join cycles c on c.id = e.cycle_id
    where (p_term is null or c.term = p_term)
      and (p_round = 'All Rounds' or c.round = p_round)
  ),
  comp as (
    select p.id, p.full_name, p.role,
      (select string_agg(pr.name, ', ' order by pr.sort_order) from assignments a
         join projects pr on pr.id = a.project_id where a.person_id = p.id) as projects,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_id = p.id) as s_self,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_id <> p.id
         and evaluator_role in ('Project Manager','Senior Consultant','External Lead')) as s_mgr,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_id <> p.id
         and evaluator_role = 'Consultant') as s_up,
      (select avg(eval_avg) from f where evaluatee_id = p.id and evaluator_role = 'SLT') as s_slt,
      (select count(*) from f where evaluatee_id = p.id) as n
    from people p where p.active and p.role not in ('SLT','External Lead')
  ),
  w as (
    select
      max(case when component = 'Self' then consultant_pct end) as c_self,
      max(case when component = 'Manager' then consultant_pct end) as c_mgr,
      max(case when component = 'Upward' then consultant_pct end) as c_up,
      max(case when component = 'SLT' then consultant_pct end) as c_slt,
      max(case when component = 'Self' then pm_sc_pct end) as l_self,
      max(case when component = 'Manager' then pm_sc_pct end) as l_mgr,
      max(case when component = 'Upward' then pm_sc_pct end) as l_up,
      max(case when component = 'SLT' then pm_sc_pct end) as l_slt
    from weights
  ),
  parts as (
    select comp.*,
      case when role = 'Consultant' then array[c_self, c_mgr, c_up, c_slt]
           else array[l_self, l_mgr, l_up, l_slt] end as wt,
      array[s_self, s_mgr, s_up, s_slt] as sc
    from comp, w
  )
  select id, full_name, role, projects,
    round(s_self, 2), round(s_mgr, 2), round(s_up, 2), round(s_slt, 2), n,
    round(case
      when (select value from app_settings where key = 'composite_missing') = 'require_all'
        and exists (select 1 from generate_subscripts(wt, 1) i where wt[i] > 0 and sc[i] is null)
        then null
      else (select sum(wt[i] * sc[i]) / nullif(sum(wt[i]), 0)
            from generate_subscripts(wt, 1) i where wt[i] > 0 and sc[i] is not null)
    end, 2)
  from parts
  order by projects, case role when 'Project Manager' then 0 when 'Senior Consultant' then 1 else 2 end, full_name
$$;

-- External leads also get the My project page for their consultants.
create or replace function my_led_projects() returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.project_id from assignments a join people p on p.id = a.person_id
  where p.id = current_person_id() and p.active and p.role in ('Project Manager','Senior Consultant','External Lead')
$$;
