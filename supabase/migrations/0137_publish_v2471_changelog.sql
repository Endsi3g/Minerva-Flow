-- Keep the latest shipped product and loyalty changes visible in the app's
-- platform changelog. This migration intentionally does not notify or email
-- users; announcement delivery remains an explicit release/admin action.
begin;

insert into public.changelog_entries (title, description, category, published_at, image_url)
select
  'v2.47.0 — Campagnes, fidélisation et commandes repensées',
  E'• **Campagnes** : historique enrichi avec filtres et recherche; le studio visuel et les automatisations ont leurs propres pages.\n• **Équipes et workspaces** : groupes de navigation restaurés et retour de tous les espaces de travail actifs.\n• **Fidélisation** : résultats filtrables par période et partage en image.\n• **Commandes** : nouveaux parcours de précommande, acompte, demande de repas sur mesure et devis traiteur, sur le web et iOS.',
  'amelioration'::public.changelog_category,
  now() - interval '1 minute',
  null
where not exists (
  select 1
  from public.changelog_entries
  where lower(title) like '%v2.47.0%'
);

insert into public.changelog_entries (title, description, category, published_at, image_url)
select
  'v2.47.1 — Consentement aux annonces produit et fidélisation renforcée',
  E'• **Préférences courriel** : choix facultatif à l’inscription, décoché par défaut et modifiable dans le profil; chaque changement est conservé dans un journal de consentement.\n• **Audiences et personnalisation** : les contacts ayant activé les annonces produit sont regroupés dans un segment dédié, avec des propriétés de contact disponibles pour personnaliser les messages.\n• **Fidélisation** : partage des résultats en image et protections renforcées pour les opérations de fidélité.',
  'fonctionnalite'::public.changelog_category,
  now(),
  null
where not exists (
  select 1
  from public.changelog_entries
  where lower(title) like '%v2.47.1%'
);

commit;
