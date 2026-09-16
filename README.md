# MémoCycle

Application de répétition espacée : Expo / React Native, SQLite local, API NestJS et PostgreSQL. Le dossier initial était vide ; aucun système existant ni donnée utilisateur n’a été remplacé.

Pour reprendre le travail depuis une autre IA ou une nouvelle session, commencer
par [docs/HANDOFF.md](docs/HANDOFF.md). Ce fichier contient l'état réel du
déploiement, les éléments externes déjà créés et les prochaines commandes. Il
doit être mis à jour avec chaque changement de livraison ou d'infrastructure.

## Prérequis

- Node.js 22 et npm.
- Docker pour les tests PostgreSQL et le serveur.
- Android SDK pour un Development Build Android ; macOS/Xcode ou EAS pour iOS.
- Clients OAuth Google Android, iOS et Web ; Sign in with Apple pour iOS.

Expo SDK 57.0.23 est utilisé, avec les versions natives du manifeste Expo. Référence : [annonce officielle SDK 57](https://expo.dev/changelog/sdk-57). L’authentification Google utilise l’API Credential Manager et le bouton natif du [module Nitro](https://react-native-nitro-google-sign-in.github.io/).

## Installation

```sh
npm ci
npm run db:generate
npm run build
```

Copier `.env.example` vers `.env`, puis renseigner les valeurs réelles. Aucune valeur de production n’est fournie. Pour Expo, copier les variables `EXPO_PUBLIC_*` et `GOOGLE_IOS_URL_SCHEME` dans `apps/mobile/.env`. Ces Client IDs sont publics ; aucun secret OAuth n’appartient au mobile. Ne pas utiliser Firebase.

L’API utilise les variables de son processus. Depuis la racine, après configuration de `.env` :

```sh
node --env-file=.env apps/api/dist/main.js
```

Appliquer les migrations avant de lancer le serveur :

```sh
node --env-file=.env node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
```

## Mobile

La bêta Android autonome est disponible en
[téléchargement direct](https://github.com/bindarst/Memocycle/releases/download/v1.0.0-beta.1/memocycle-android-v1.0.0-beta.1.apk)
et sur la [page de la release](https://github.com/bindarst/Memocycle/releases/tag/v1.0.0-beta.1).
Elle s'installe directement sur Android, sans Expo et sans connexion USB. Les
APK restent hors de Git et sont joints aux releases.

L'interface utilise les icônes vectorielles open source Lucide et une courbe de
l'oubli actualisée à partir du planning local. La méthode de calcul, ses limites
et les références sont détaillées dans [docs/DESIGN.md](docs/DESIGN.md).

```sh
cd apps/mobile
npx expo run:android
# Sur macOS configuré :
npx expo run:ios
```

Ensuite : `npm run dev:mobile` à la racine. Expo Go ne suffit pas. Les clients Android doivent correspondre au package `app.memocycle.mobile` et aux empreintes de signature du build. Le schéma iOS Google est le Client ID iOS inversé, `com.googleusercontent.apps.…`. Configurer séparément les signatures de développement et de production. Ne pas distribuer un build contenant des identifiants de validation CI.

Le plugin local `apps/mobile/plugins/with-short-cmake-builds.js` place les fichiers CMake temporaires dans un chemin plus court. Il évite la limite Windows de 260 caractères lors de la génération Android et est réappliqué automatiquement par Expo Prebuild.

## Vérifications

```sh
npm run build
npm run lint
npm run typecheck
npm test
docker compose -p memocycle-tests -f infra/docker-compose.test.yml up -d --wait
```

Sous PowerShell, pour les tests PostgreSQL isolés :

```powershell
$env:DATABASE_URL = 'postgresql://memocycle_test:local_test_only@127.0.0.1:55439/memocycle_test'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:migrate
npm run test:api
```

Les tests d’intégration refusent de démarrer si `TEST_DATABASE_URL` ne désigne pas `memocycle_test`. Ils effacent leurs utilisateurs de test entre cas : ne jamais leur fournir une base de travail.

Pour valider les bundles sans OAuth de production, fournir uniquement pour cette commande `GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.ci-bundle-validation-only`, puis exécuter `npm run build:validate -w @memocycle/mobile`. Cela vérifie la compilation, pas une connexion Google réelle.

## Déploiement OVH

L'API est déployée sur le VPS OVH et répond à l'adresse
`https://memocycle.135-125-100-75.sslip.io`. Elle utilise les conteneurs
`memocycle-api` et `memocycle-postgres`, un réseau Docker interne et le volume
`memocycle-postgres-data`. Cette base est distincte de la GMAO Equaz.

Le déploiement isolé est décrit par `infra/docker-compose.ovh.yml`. Le script
`infra/bootstrap-ovh.sh` crée ses propres secrets sur le serveur et refuse une
configuration faisant référence à Equaz. Les identifiants, clés de signature et
fichiers `.env` restent hors Git.

## État de livraison

Le parcours métier et ses transactions sont implémentés et testés. L'API et sa
base PostgreSQL isolée sont actives sur OVH. Les clients OAuth Android et Web
sont créés, l'API est configurée et l'APK de production est signé. La version
1.0.0 a été installée et démarrée sur un téléphone Android physique. La
publication OAuth générale reste conditionnée aux mentions légales validées et
aux essais fonctionnels complets. Le compte du propriétaire est autorisé comme
utilisateur test Google. Les limites précises sont consignées dans
[docs/RELEASE.md](docs/RELEASE.md), et les choix de synchronisation dans
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

La CI compile, vérifie TypeScript et ESLint, teste le moteur et SQLite réel, applique les migrations, teste PostgreSQL et exporte les bundles Android/iOS.
