create or replace view public.flow_ambassador_link_stats
with (security_invoker = true)
as
select
  l.id,
  l.ambassador_id,
  l.slug,
  l.label,
  l.platform,
  l.content_url,
  l.created_at,
  count(distinct c.id)::bigint as clicks,
  count(distinct r.id)::bigint as signups
from public.flow_ambassador_links l
left join public.flow_ambassador_link_clicks c on c.link_id = l.id
left join public.flow_ambassador_referrals r on r.referral_link_id = l.id
group by l.id;

grant select on public.flow_ambassador_link_stats to authenticated, service_role;
comment on view public.flow_ambassador_link_stats is 'Per-link aggregate click and signup counts; security_invoker preserves source-table RLS.';
