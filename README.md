# MémoCycle

Assistant personnel d'apprentissage et répétition espacée intelligente : Expo / React Native, moteur FSRS adaptatif, SQLite local offline-first, API NestJS et PostgreSQL.

Pour reprendre le travail depuis une autre IA ou une nouvelle session, commencer
par [docs/HANDOFF.md](docs/HANDOFF.md). Les choix d'architecture et de synchronisation
sont détaillés dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Fonctionnalités Principales

- **Moteur Mémoire Adaptatif (FSRS-6)** : Calcul dynamique et scientifique des intervalles de rappel basé sur la difficulté perçue, la stabilité mémoire et la rétention cible souhaitée (90 % par défaut). Rétro-compatibilité intégrale avec le cycle classique historique (6 étapes fixes).
- **Rappel Actif & Unités d'Étude (`StudyItem`)** : Fiches de mémorisation (*flashcards*), questions ciblées, textes à trous et notes avec auto-évaluation en 4 niveaux (*Oublié*, *Difficile*, *Bien*, *Facile*).
- **Sessions de Travail Guidées & Focus** : Minuteur d'étude avec mode Focus Pomodoro (25 min par défaut) et révision active.
- **Planificateur Quotidien Intelligent** : Calcul des priorités combinant retard, probabilité d'oubli, importance du cours et planification à rebours avant les examens.
- **Équilibrage de Charge** : Lissage automatique des révisions sur 14 jours évitant les surcharges sans compromettre la rétention ni déplacer les examens.
- **Agenda & Calendrier** : Vues Agenda, Semaine et Mois avec prévision de charge (temps estimé et nombre de révisions).
- **Tableau de Bord & Statistiques** : Section *À consolider*, suivi de la régularité (streaks sobres sans gamification excessive), taux de rétention moyen, diagnostics des matières fragiles et heatmap d'activité.
- **Offline-First & Synchronisation Multi-Appareils** : Fonctionnement complet sans connexion Internet, outbox SQLite synchronisée avec PostgreSQL sans Firebase.

## Prérequis

- Node.js 22 et npm.
- Docker pour les tests PostgreSQL et le serveur.
- Android SDK pour un Development Build Android ; macOS/Xcode ou EAS pour iOS.
- Clients OAuth Google Android, iOS et Web ; Sign in with Apple pour iOS.

Expo SDK 57.0.23 est utilisé, avec les versions natives du manifeste Expo. L’authentification Google utilise l’API Credential Manager et le bouton natif du module Nitro.

## Installation

```sh
npm ci
npm run db:generate
npm run build
```

Copier `.env.example` vers `.env`, puis renseigner les valeurs réelles. Pour Expo, copier les variables `EXPO_PUBLIC_*` et `GOOGLE_IOS_URL_SCHEME` dans `apps/mobile/.env`. Ces Client IDs sont publics ; aucun secret OAuth n’appartient au mobile. Ne pas utiliser Firebase.

L’API utilise les variables de son processus. Depuis la racine, après configuration de `.env` :

```sh
node --env-file=.env apps/api/dist/main.js
```

Appliquer les migrations avant de lancer le serveur :

```sh
node --env-file=.env node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
```

## Mobile

```sh
cd apps/mobile
npx expo run:android
# Sur macOS configuré :
npx expo run:ios
```

Ensuite : `npm run dev:mobile` à la racine.

## Vérifications

```sh
npm run build
npm run lint
npm run typecheck
npm test
```

Sous PowerShell, pour les tests PostgreSQL isolés :

```powershell
$env:DATABASE_URL = 'postgresql://memocycle_test:local_test_only@127.0.0.1:55439/memocycle_test'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:migrate
npm run test:api
```

## Déploiement OVH

L'API est déployée sur le VPS OVH et répond à l'adresse
`https://memocycle.135-125-100-75.sslip.io`. Elle utilise les conteneurs
`memocycle-api` et `memocycle-postgres`, un réseau Docker interne et le volume
`memocycle-postgres-data`.
