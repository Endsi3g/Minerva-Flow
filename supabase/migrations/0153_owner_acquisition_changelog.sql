-- Aggregate attributed member signups without returning customer identities.
-- SECURITY INVOKER keeps the caller's Supabase RLS policies in force.
create or replace function public.get_registration_source_counts(p_restaurant_id uuid)
returns table(source text, registration_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(nullif(lower(btrim(le.metadata ->> 'source')), ''), 'unknown') as source,
    count(*)::bigint as registration_count
  from public.lifecycle_events le
  where le.restaurant_id = p_restaurant_id
    and le.event_type = 'registration_completed'
  group by 1
$$;

revoke all on function public.get_registration_source_counts(uuid) from public;
grant execute on function public.get_registration_source_counts(uuid) to authenticated;

-- Keep the in-app changelog aligned with the behavior now being verified.
update public.changelog_entries
set description = E'• **Ouvert à tous** : chaque membre peut créer un lien personnel et suivre les workspaces recommandés.\n• **Commissions** : 10 % de la première facture d’abonnement payée; versement admissible après 30 jours et approbation manuelle par Minerva Flow avant le transfert Stripe.\n• **UGC réel** : seuls les restaurants qui acceptent explicitement apparaissent dans le répertoire. Les publications sont modérées avant réutilisation; les ambassadeurs doivent divulguer leur commission.\n• **Espace dédié** : guide de démarrage, lien de partage, suivi des gains, configuration Stripe et soumission de contenu au même endroit.'
where lower(title) like '%ambassadeurs%ugc%';

insert into public.changelog_entries (title, description, category, published_at, image_url)
select
  'Démarrage fidélité et QR d’inscription',
  E'• **Configuration guidée** : définissez le nombre de points gagnés par dollar pendant la création de votre espace.\n• **Inscription client** : générez tout de suite un lien et un QR code partageables.\n• **Aucun faux client ni récompense surprise** : les membres ne sont créés qu’à leur inscription et les récompenses restent à configurer par le propriétaire.',
  'amelioration'::public.changelog_category,
  now(),
  null
where not exists (
  select 1 from public.changelog_entries
  where lower(title) = lower('Démarrage fidélité et QR d’inscription')
);
