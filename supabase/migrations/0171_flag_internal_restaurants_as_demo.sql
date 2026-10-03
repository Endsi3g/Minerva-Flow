-- Internal/owner-operator restaurants must not count in team funnel, MRR
-- or activation figures (see lib/data/team-metrics.ts, which excludes
-- is_demo). Scoped on purpose: the founder's own "Minerva Flow" restaurant
-- and the "Mon restaurant" default row owned by the founder's account.
-- Other default-named rows belong to real sign-ups and are NOT touched.
-- Already applied to production on 2026-10-03; re-running is a no-op.

begin;

update public.restaurants r
set is_demo = true
where not r.is_demo
  and (
    r.id = '60a59423-c7a0-4d92-a866-3058f34c17d1'
    or (
      r.name = 'Mon restaurant'
      and exists (
        select 1
        from public.restaurant_members m
        join auth.users u on u.id = m.user_id
        where m.restaurant_id = r.id
          and m.role = 'owner'
          and lower(u.email) = 'quebecsaas@gmail.com'
      )
    )
  );

commit;
