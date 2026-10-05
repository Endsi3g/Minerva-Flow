# Tests Playwright isolés

Les tests E2E créent et suppriment des utilisateurs et des restaurants. Ils ne doivent jamais charger les identifiants de `.env.local`.

1. Démarrer un projet Supabase local isolé, appliquer les migrations, puis copier ses valeurs locales dans le fichier ignoré `.env.test.local` à la racine :

```dotenv
E2E_TEST_SUPABASE_URL=http://127.0.0.1:54321
E2E_TEST_SUPABASE_ANON_KEY=<clé-anon-du-projet-local>
E2E_TEST_SUPABASE_SERVICE_ROLE_KEY=<clé-service-role-du-projet-local>
E2E_TEST_STRIPE_SECRET_KEY=sk_test_local
E2E_TEST_STRIPE_WEBHOOK_SECRET=whsec_local_e2e
```

2. Lancer `npm run test:e2e`. Le serveur Next et les fixtures utilisent la même URL Supabase de test; les appels aux fournisseurs externes sont désactivés par défaut.

Les projets Supabase distants exigent `E2E_ALLOW_REMOTE_TEST_DB=true` et un `E2E_TEST_SUPABASE_PROJECT_REF` qui correspond exactement à l'URL. Le projet de production Minerva Flow connu est toujours refusé. Le navigateur Playwright est limité à l'app locale tant qu'un preview avec base isolée n'est pas vérifié; une URL distante est donc refusée.

Ne jamais copier une clé de service-role ou une clé Stripe live dans ce fichier. Les secrets de test restent locaux et ignorés par Git.
