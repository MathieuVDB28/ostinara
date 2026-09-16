# Ostinara

PWA pour guitaristes : suivre sa progression, gérer son répertoire, partager
ses covers. Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase.

## Démarrer

```bash
npm install
npm run dev          # HTTPS local — requis pour l'accordeur (micro) et la PWA
```

Copier `.env.example` vers `.env.local` et renseigner les clés Supabase,
Spotify, Stripe et VAPID.

## Commandes

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement, HTTPS expérimental |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run icons` | Régénère le sous-ensemble Material Symbols — **à relancer après avoir ajouté une icône**, sinon elle s'affiche en texte brut |

## Conventions

Voir [CLAUDE.md](./CLAUDE.md) : structure, modèle de données, palette et
règles de code.

Deux règles qui se voient tout de suite :

- **Les couleurs viennent des jetons** de `src/app/globals.css`, jamais de la
  palette Tailwind par défaut. `bg-green-500` n'est pas lisible en thème clair.
- **La navigation est décrite une seule fois**, dans `src/lib/navigation.ts`.
