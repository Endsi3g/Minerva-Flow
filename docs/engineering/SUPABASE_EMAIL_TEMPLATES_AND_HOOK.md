# Configuration des courriels Supabase — Minerva Flow

Ce document configure les courriels d’authentification pour la production.

## Décision d’architecture

Utiliser **Send Email Hook → HTTPS**. Ne pas créer de fonction PostgreSQL pour
envoyer des courriels : une fonction SQL ne doit pas contenir la clé Resend et
ne fournit pas le même suivi, la même validation de signature ni les mêmes
retries.

La route déjà présente dans l’application est :

```text
POST https://minervaflow.app/api/auth/send-email-hook
```

Elle accepte les événements Supabase signés avec `standardwebhooks`, choisit le
template selon `email_action_type`, puis envoie via Resend.

## 1. Resend

Dans Resend :

1. Ajouter et vérifier le domaine `minervaflow.app`.
2. Ajouter les DNS SPF, DKIM et DMARC demandés par Resend.
3. Utiliser comme expéditeur :
   `Minerva Flow <flow@minervaflow.app>`.
4. Envoyer un courriel de test depuis Resend vers une boîte contrôlée.

Les variables Vercel Production doivent être présentes :

```text
RESEND_API_KEY
SEND_EMAIL_HOOK_SECRET
```

Ne jamais inscrire ces valeurs dans Git, dans une migration SQL ou dans une
template HTML.

## 2. Hook Supabase

Dans **Supabase → Authentication → Hooks → Send Email** :

1. Cliquer **Create hook**.
2. Choisir **HTTPS** (et non PostgreSQL Function).
3. URL : `https://minervaflow.app/api/auth/send-email-hook`.
4. Générer un nouveau secret au format `v1,whsec_…`.
5. Copier exactement ce secret dans Vercel Production sous
   `SEND_EMAIL_HOOK_SECRET`.
6. Enregistrer et activer le hook.

Après tout changement de variable Vercel, effectuer un déploiement Production
avant le test. Une réponse HTTP autre que 2xx doit apparaître comme une erreur
dans les logs du hook.

## 3. Réglages Email Auth

Dans **Authentication → Providers → Email** :

- Email provider : **Enabled**
- Allow new users to sign up : **Enabled**
- Confirm email : **Enabled** pour le portail propriétaire
- OTP length : **6**
- OTP expiry : **600–3600 secondes**
- Minimum resend interval : **60 secondes** en production

Pour les clients iOS, le code OTP est envoyé par le même hook. L’application
utilise `verifyOtp` avec le type `magiclink` et ne dépend pas d’une page web.

## 4. Templates Supabase de secours

Ces templates sont utiles uniquement si le hook HTTPS est désactivé. Lorsque le
hook est actif, Supabase remplace l’envoi intégré et ces templates ne sont plus
le chemin d’envoi principal.

Dans **Authentication → Email Templates**, utiliser une mise en page HTML
Minerva (fond `#f5f1e6`, surface `#fffefa`, accent `#167f5b`) et conserver les
variables Supabase telles quelles.

### Confirm signup

- Sujet : `Confirmez votre compte Minerva Flow`
- Bouton : `Confirmer mon compte`
- URL : `{{ .ConfirmationURL }}`
- Texte : `Bienvenue dans Minerva Flow. Confirmez votre adresse courriel pour activer votre compte.`

### Magic link / OTP

- Sujet : `Votre code Minerva Flow`
- Bouton : `Ouvrir Minerva Flow`
- URL : `{{ .ConfirmationURL }}`
- Texte : `Voici votre code de connexion. Il expire bientôt. Si vous n’êtes pas à l’origine de cette demande, ignorez ce courriel.`

### Invite user

- Sujet : `Vous êtes invité·e sur Minerva Flow`
- Bouton : `Accepter l’invitation`
- URL : `{{ .ConfirmationURL }}`

### Change email address

- Sujet : `Confirmez votre nouvelle adresse — Minerva Flow`
- Bouton : `Confirmer la nouvelle adresse`
- URL : `{{ .ConfirmationURL }}`

### Reset password

- Sujet : `Réinitialisez votre mot de passe Minerva Flow`
- Bouton : `Choisir un nouveau mot de passe`
- URL : `{{ .ConfirmationURL }}`

### Reauthentication

- Sujet : `Confirmez votre identité — Minerva Flow`
- Bouton : `Confirmer`
- URL : `{{ .ConfirmationURL }}`

## 5. Test obligatoire de bout en bout

Créer un compte de test avec une adresse qui n’existe pas encore :

1. Ouvrir une fenêtre privée sur `https://minervaflow.app/fr/sign-up`.
2. Créer le compte.
3. Confirmer la réception du message (boîte principale, promotions et spam).
4. Cliquer le bouton.
5. Vérifier le retour vers `/auth/confirm` puis `/overview`.
6. Se déconnecter et refaire une connexion avec le même compte.
7. Répéter avec un compte client iPhone : demander le code, saisir les six chiffres,
   vérifier que l’app passe à l’écran d’accueil sans ouvrir Safari.

Si aucun message n’arrive, consulter simultanément :

- **Supabase → Logs → Auth** : l’événement d’envoi et son erreur éventuelle ;
- **Vercel → Logs** filtré sur `/api/auth/send-email-hook` ;
- **Resend → Emails** : statut `delivered`, `bounced` ou `failed`.

Un test n’est validé que lorsque l’événement apparaît dans ces trois endroits.

