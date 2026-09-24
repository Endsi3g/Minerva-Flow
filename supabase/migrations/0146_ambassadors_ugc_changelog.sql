-- Publish the ambassador and restaurant-consented UGC program in the in-app changelog.
insert into public.changelog_entries (title, description, category, published_at, image_url)
select
  'Ambassadeurs & UGC — recommandations rémunérées et contenu authentique',
  E'• **Ouvert à tous** : chaque membre peut créer un lien personnel et suivre les workspaces recommandés.\n• **Commissions** : 10 % de la première facture d’abonnement payée; paiement admissible après 30 jours, puis transfert vers un compte Stripe vérifié.\n• **UGC réel** : seuls les restaurants qui acceptent explicitement apparaissent dans le répertoire. Les publications sont modérées avant réutilisation; les ambassadeurs doivent divulguer leur commission.\n• **Espace dédié** : guide de démarrage, lien de partage, suivi des gains, configuration Stripe et soumission de contenu au même endroit.',
  'fonctionnalite'::public.changelog_category,
  now(),
  '/assets/changelog/ambassadeurs-ugc.png'
where not exists (
  select 1 from public.changelog_entries
  where lower(title) like '%ambassadeurs & ugc%'
);
