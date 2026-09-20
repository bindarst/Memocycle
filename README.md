# MémoCycle

Assistant personnel d'apprentissage et répétition espacée intelligente : Expo / React Native, moteur FSRS adaptatif, SQLite local offline-first, API NestJS et PostgreSQL.

Pour reprendre le travail depuis une autre IA ou une nouvelle session, commencer
par [docs/HANDOFF.md](docs/HANDOFF.md). Les choix d'architecture et de synchronisation
sont détaillés dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Fonctionnalités Principales

- **Moteur Mémoire Adaptatif (FSRS-6)** : Calcul dynamique et scientifique des intervalles de rappel basé sur la difficulté perçue, la stabilité mémoire et la rétention cible souhaitée (90 % par défaut). Rétro-compatibilité intégrale avec le cycle classique historique (6 étapes fixes).
- **Rappel Actif & Unités d'Étude (`StudyItem`)** : Fiches de mémorisation (*flashcards*), questions ciblées, textes à trous et notes avec auto-évaluation en 4 niveaux (*Oublié*, *Difficile*, *Bien*, *Facile*).
- **Sessions de Travail Guidées & Focus** : Minuteur d'étude Focus ou chrono libre, conservé par cours dans SQLite et recalculé depuis l'heure réelle même après fermeture de l'application, avec révision active.
- **Planificateur Quotidien Intelligent** : Calcul des priorités combinant retard, probabilité d'oubli, importance du cours et planification à rebours avant les examens.
- **Équilibrage de Charge** : Lissage automatique des révisions sur 14 jours évitant les surcharges sans compromettre la rétention ni déplacer les examens.
- **Agenda & Calendrier** : Vues Agenda, Semaine et Mois avec prévision de charge (temps estimé et nombre de révisions).
- **Examens faciles à dater** : calendrier tactile, horaires rapides et modification de la date depuis la matière ou le module.
- **PDF locaux** : documents ajoutés aux matières, cours ou fiches et conservés uniquement dans le stockage privé du téléphone (50 Mo maximum par PDF).
- **Tableau de Bord & Statistiques** : Section *À consolider*, suivi de la régularité (streaks sobres sans gamification excessive), taux de rétention moyen, diagnostics des matières fragiles et heatmap d'activité.
- **Offline-First & Synchronisation Multi-Appareils** : Fonctionnement complet sans connexion Internet, outbox SQLite synchronisée avec PostgreSQL sans Firebase.
- **Aide intégrée** : guide détaillé avec recherche, FAQ et dépannage accessibles hors ligne depuis Profil.

Les données d'étude sont enregistrées dans SQLite sur le téléphone et synchronisées
avec la base PostgreSQL dédiée à MémoCycle sur OVH lorsque la connexion le permet.
Les PDF joints ne sont pas envoyés à OVH ni transférés entre appareils ; ils sont
effacés en cas de déconnexion ou de désinstallation. Le chrono en cours reste local.
Google sert à l'identification, pas au stockage des cours. La sauvegarde automatique
Android de l'application est désactivée. Le volume PostgreSQL du VPS n'est pas une sauvegarde indépendante :
aucune sauvegarde OVH exécutée ou restaurée n'est vérifiée à ce jour.

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

Les nouveaux livrables signés sont `artifacts/Memocycle-v1.0.10.apk` et
`artifacts/Memocycle-v1.0.10.aab` (version Android 1.0.10, code 11), également
copiés dans `C:\Users\Adminpc\OneDrive\Memocycle\`. Ouvrir l'APK sur un téléphone
Android permet une installation directe, sans Expo ni USB. Google Play demande
le fichier AAB. La version 1.0.7 est publiée sur le canal de test interne Google Play ; la 1.0.10 est prête à être importée. Cette version ajoute le plan examen, la courbe interactive, le radar de maîtrise, le bilan hebdomadaire et le widget Android, en plus de corriger les titres longs. Le canal est
actif pour `bindarst2011@gmail.com` et le lien d'inscription est
https://play.google.com/apps/internaltest/4701281405599427540. La mise en
production reste soumise au test fermé obligatoire de 12 testeurs pendant
14 jours affiché par Play Console.
La procédure de reconstruction et d'importation est détaillée dans
[docs/COMMENT_METTRE_A_JOUR_GOOGLE_PLAY.md](docs/COMMENT_METTRE_A_JOUR_GOOGLE_PLAY.md).
La [présentation de l'application](https://memocycle.135-125-100-75.sslip.io/v1/public),
la [politique de confidentialité](https://memocycle.135-125-100-75.sslip.io/v1/public/privacy)
et la [demande de suppression](https://memocycle.135-125-100-75.sslip.io/v1/public/delete-account)
sont accessibles publiquement. État de la soumission : voir
[docs/PLAY_STORE_SUBMISSION_GUIDE.md](docs/PLAY_STORE_SUBMISSION_GUIDE.md).

## iPhone et Expo

Le projet EAS est lié à [@bindarst/memocycle](https://expo.dev/accounts/bindarst/projects/memocycle).
Le bundle JavaScript iOS se compile, mais aucun fichier iPhone
installable n'a été produit : EAS demande des certificats et un profil Apple pour
la distribution interne. Le compte ne dispose pas actuellement d'un abonnement
Apple Developer. Expo Go de l'App Store ne peut pas ouvrir ce projet SDK 57,
qui utilise aussi des modules natifs supplémentaires. Une installation iPhone
demande un compte Apple Developer pour EAS, ou un Mac avec Xcode pour un build
local de développement. La connexion Google iOS nécessite encore un client OAuth
iOS ; le bouton Google est masqué sur iOS tant qu'il manque. La connexion Apple
et le comportement de sauvegarde iCloud des PDF restent à valider avant de
promettre un usage iPhone complet.

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
