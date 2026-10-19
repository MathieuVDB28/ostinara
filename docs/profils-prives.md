# Chantier : sortir les donnees privees de `profiles`

> **Etat (octobre 2026)** : etape 1 faite — `supabase/migrations/20261104_profile_private.sql`
> et le code qui lit / ecrit `profile_private`. Etape 2 prete dans
> `supabase/pending/20261105_profile_private_drop.sql`, a appliquer **apres** la
> mise en production du code (voir « Deploiement » en bas).

## Le probleme

La policy « Users can view other profiles » (`20241222_initial_schema.sql`) rend
**toute** la ligne `profiles` lisible par n'importe qui, sans compte (`USING (true)`,
role `anon` compris). Avec la cle anon publique du site, on peut lire pour tous
les comptes :

- `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`
- `subscription_status`, `subscription_period_end`
- `locale`, `practice_reminders`, `badges_synced_at`

Les jetons Spotify ne sont plus concernes : `20261018_deezer_catalog.sql` a
supprime les colonnes `spotify_*`.

Deja fait (octobre 2026) : l'app ne lit plus le profil **d'un autre** qu'avec
`PUBLIC_PROFILE_COLUMNS` (`src/lib/public-profile.ts`) ; `getPublicProfile`,
`getFriendProfile` et le feed n'envoient plus l'abonnement d'un ami au navigateur.
Mais la base, elle, repond toujours a qui interroge l'API directement.

## La cible

```
profiles          (lisible par tous)       id, username, display_name, avatar_url, bio,
                                           liens sociaux, is_private, plan, staff_role,
                                           created_at, updated_at
profile_private   (lisible par soi seul)   user_id PK → profiles, stripe_customer_id,
                                           stripe_subscription_id, stripe_price_id,
                                           subscription_status, subscription_period_end,
                                           locale, practice_reminders, badges_synced_at
```

`plan` reste public : le badge Pro / Band s'affiche sur les profils.

## Migration (une seule, `2026xxxx_profile_private.sql`)

1. `CREATE TABLE profile_private` + RLS :
   - SELECT : `auth.uid() = user_id`
   - UPDATE : `auth.uid() = user_id`, avec un trigger qui bloque les colonnes
     d'abonnement (reprendre `protect_profile_billing`) ; seuls `locale` et
     `practice_reminders` restent modifiables par l'utilisateur
   - pas d'INSERT ni de DELETE cote client
2. Recopier les donnees : `INSERT INTO profile_private SELECT id, … FROM profiles`.
3. Creer la ligne a l'inscription : l'ajouter dans `handle_new_user` (et dans le
   repli de `src/app/auth/callback/route.ts`).
4. Adapter ce qui lit ces colonnes en SQL : `join_waitlist` ne touche pas
   `profiles` ; `primary_instrument` non plus. A verifier : les RPC qui lisent
   `profiles.locale` (aucune a ce jour).
5. **Dans un second deploiement**, une fois le code en production : supprimer
   les colonnes de `profiles` (`ALTER TABLE profiles DROP COLUMN …`) et le
   trigger `protect_profile_billing`, devenu inutile. Les deux temps evitent
   que l'ancien code (encore servi pendant le deploiement) casse.

## Code a modifier

| Colonnes | Fichiers |
|---|---|
| `stripe_*`, `subscription_*` (ecriture) | `src/app/api/stripe/webhooks/route.ts`, `src/app/api/stripe/checkout/route.ts` (service role : changer de table) |
| `stripe_customer_id` (lecture) | `src/app/api/stripe/portal/route.ts`, `src/app/(main)/account/subscription/page.tsx` |
| `subscription_status`, `subscription_period_end` (lecture) | `src/app/(main)/profile/edit/page.tsx`, `src/components/profile/settings-list.tsx` (via `getMyProfile`) |
| `locale` | `src/app/(main)/layout.tsx` (lecture + rattrapage), `src/lib/actions/locale.ts`, `src/i18n/server.ts` → `recipientLocale` est alimente par `src/lib/notifications/send-push.ts` (`resolvePayload`), `src/app/api/cron/rehearsal-reminders/route.ts` |
| `practice_reminders` | `src/app/api/cron/practice-reminders/route.ts`, `src/components/profile/notification-setting.tsx` (+ son action) |
| `badges_synced_at` | `src/lib/badges/sync.ts` (service role) |
| type | `Profile` dans `src/types/index.ts` : sortir ces champs dans un type `ProfilePrivate`, joint par `getMyProfile` (`private:profile_private(*)`) |

Les crons et le webhook utilisent le service role : il suffit de changer de
table. Le plus delicat est `getMyProfile`, qui nourrit Reglages et l'abonnement.

## Verifications

- Avec la cle anon : `GET /rest/v1/profiles?select=stripe_customer_id` doit
  repondre une erreur de colonne (apres l'etape 5), et
  `GET /rest/v1/profile_private` une liste vide.
- Parcours : inscription → ligne `profile_private` creee ; checkout Stripe →
  webhook → statut visible dans Reglages ; portail Stripe ; changement de
  langue → push recue dans la nouvelle langue ; rappels de pratique
  desactives → pas de push du cron.
- A faire sur une base de preproduction (branche Supabase) avant la prod.

## Deploiement

1. Appliquer `20261104_profile_private.sql` (cree et remplit `profile_private`,
   et recopie dans la nouvelle table ce que l'ancien code ecrit encore dans
   `profiles`, webhook Stripe compris).
2. Deployer le code.
3. Verifier : Reglages > Abonnement affiche le bon statut ; un changement de
   langue s'enregistre (`select locale from profile_private where user_id = …`).
4. Deplacer `supabase/pending/20261105_profile_private_drop.sql` dans
   `supabase/migrations/` et l'appliquer : les colonnes quittent `profiles`, le
   miroir s'arrete, `protect_profile_billing` ne garde que `plan`.

Avant 1, verifier qu'aucun `stripe_customer_id` n'est en double (la nouvelle
colonne est UNIQUE) :
`select stripe_customer_id, count(*) from profiles where stripe_customer_id is not null group by 1 having count(*) > 1;`
