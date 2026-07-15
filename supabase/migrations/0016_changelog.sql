-- Minerva Flow — Journal des mises à jour (changelog), visible par tous les
-- utilisateurs connectés (pas restreint à un restaurant — c'est une
-- information plateforme). Publier une entrée déclenche une notification
-- à tous les utilisateurs actifs, tous établissements confondus (voir
-- lib/data/notifications.ts:notifyAllUsers, appelée depuis
-- app/admin/changelog/actions.ts — pas depuis cette migration, pour éviter
-- de spammer une notification par entrée historique importée ci-dessous).

begin;

create type changelog_category as enum ('fonctionnalite', 'amelioration', 'correctif');

create table changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category changelog_category not null default 'fonctionnalite',
  published_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_changelog_entries_published on changelog_entries (published_at desc);

alter table changelog_entries enable row level security;

-- Visible par tout utilisateur connecté, peu importe son établissement —
-- c'est une info plateforme, pas une donnée de restaurant.
create policy "changelog_entries_select" on changelog_entries for select
  using (auth.uid() is not null);

create policy "changelog_entries_admin_insert" on changelog_entries for insert
  with check (is_platform_admin());
create policy "changelog_entries_admin_delete" on changelog_entries for delete
  using (is_platform_admin());

-- ── historique des lots/phases déjà livrés ────────────────────────────────
insert into changelog_entries (title, description, category, published_at) values
  ('Gestion du workspace et navigation repensée', 'Nouvelle page pour configurer votre établissement depuis le sélecteur, sidebar réorganisée en sections repliables, correctifs d''affichage (carte centrée sur Montréal, couleurs, bannière de démarrage pour les comptes non configurés).', 'fonctionnalite', now() - interval '9 days'),
  ('Invitations par lien, campagnes enrichies, rapports partageables', 'Invitez votre équipe avec un simple lien plutôt qu''un courriel. Créez des campagnes avec images et fichiers joints. Filtrez et partagez vos rapports par lien public en lecture seule.', 'fonctionnalite', now() - interval '8 days'),
  ('Guide, support et pages légales', 'Nouvelle page Guide pour configurer l''application en quelques minutes, formulaire de support intégré, conditions d''utilisation et politique de confidentialité.', 'fonctionnalite', now() - interval '7 days'),
  ('Suivi des employés et revues de performance', 'Nouvelle page pour suivre vos employés, leurs quarts de travail et publier des revues de performance — avec une revue automatique générée par IA sur vos données réelles.', 'fonctionnalite', now() - interval '6 days'),
  ('Import de données historiques et démarrage guidé', 'Importez des mois ou années de revenus depuis un fichier Excel/CSV en un clic. Une checklist de démarrage vous guide dans les premières étapes.', 'fonctionnalite', now() - interval '5 days'),
  ('Sécurité et fiabilité renforcées', 'Protection contre les abus sur les liens publics, surveillance des erreurs en production, et limitation de l''historique chargé pour garder l''application rapide même avec beaucoup de données.', 'amelioration', now() - interval '5 days'),
  ('Panneau d''administration', 'Nouvel espace pour consulter tous les établissements, répondre aux demandes de support et suivre les demandes d''accès pilote.', 'fonctionnalite', now() - interval '4 days'),
  ('Conformité à la Loi 25', 'Suppression de compte en libre-service, registre des incidents, responsable de la protection des renseignements personnels désigné.', 'amelioration', now() - interval '3 days'),
  ('Connexion Square et export QuickBooks', 'Base technique posée pour synchroniser vos ventes Square automatiquement, et export de vos transactions au format QuickBooks dès maintenant.', 'fonctionnalite', now() - interval '2 days'),
  ('Facturation et parrainage', 'Mise en place de la facturation par abonnement, et le programme de parrainage récompense maintenant automatiquement un mois gratuit par filleul actif.', 'fonctionnalite', now() - interval '1 day'),
  ('Journal des mises à jour', 'Vous y êtes ! Chaque nouvelle mise à jour de Minerva Flow sera annoncée ici, avec une notification pour vous prévenir.', 'fonctionnalite', now());

commit;
