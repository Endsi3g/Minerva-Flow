-- DRAFT — NOT APPLIED. Publish with the release, once the exact build and
-- deployment it describes are verified (CLAUDE.md: never claim a release is
-- available before its changelog entry and release state are verified).
-- Apply through the normal release workflow, and mirror it in
-- lib/data/changelog.ts so the web fallback matches.
insert into changelog_entries (title, description, category, audience, version, published_at)
values (
  'Application propriétaire : commandes, statistiques et offres depuis votre téléphone',
  'Page de commande avec délai de préparation et message au client, alerte sonore et vibration à chaque nouvelle commande, Aperçu avec graphique des ventes interactif, page Statistiques, Finances avec courbe du net, fiches client et équipe, suivi par emplacement, création d''offres avec photo et ajout de photos aux articles du menu.',
  'fonctionnalite',
  'owner',
  null,
  now()
);
