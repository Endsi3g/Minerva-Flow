-- Attach reviewed, customer-free onboarding screenshots to the in-app update.
update public.changelog_entries
set image_url = '/assets/changelog/loyalty-onboarding-desktop.png',
    description = E'• **Configuration guidée** : définissez le nombre de points gagnés par dollar pendant la création de votre espace.\n• **Inscription client** : générez tout de suite un lien et un QR code partageables.\n• **Aucun faux client ni récompense surprise** : les membres ne sont créés qu’à leur inscription et les récompenses restent à configurer par le propriétaire.\n• **Capture mobile** : [voir le parcours sur téléphone](/assets/changelog/loyalty-onboarding-mobile.png).'
where lower(title) = lower('Démarrage fidélité et QR d’inscription');
