# Reprise du projet MémoCycle

Dernière mise à jour : 16 septembre 2026.

Ce document est la source de vérité pour reprendre le projet. Ne jamais ajouter
de mot de passe, de secret JWT, de fichier `.env`, de clé privée ou de keystore
dans Git. Mettre ce document et le README à jour après chaque changement de
livraison ou d'infrastructure.

## Dépôt et architecture

- Dépôt public : `https://github.com/bindarst/Memocycle`, branche `main`.
- Mobile : Expo/React Native natif, package Android `app.memocycle.mobile`.
- API : NestJS, préfixe `/v1`.
- Données locales : SQLite avec synchronisation par outbox.
- Données serveur : PostgreSQL géré par Prisma.
- L'application mobile appelle l'API HTTPS. Elle ne se connecte jamais
  directement à PostgreSQL.

## État OVH

- VPS : `135.125.100.75`, utilisateur SSH `ubuntu`.
- Projet serveur : `/home/ubuntu/Memocycle`.
- API publique : `https://memocycle.135-125-100-75.sslip.io`.
- Contrôle de santé : `GET /v1/health` retourne `{"status":"ok"}`.
- Conteneurs : `memocycle-api` et `memocycle-postgres`.
- Réseaux : `memocycle-backend` interne et `memocycle-egress` pour l'API.
- Volume PostgreSQL : `memocycle-postgres-data`.
- Port API sur l'hôte : `127.0.0.1:8092`, exposé uniquement par Caddy.
- Secrets : `/home/ubuntu/Memocycle/.env`, permissions `0600`. Ne jamais les
  afficher ni les copier dans Git.

MémoCycle utilise une base, un volume, des conteneurs et des réseaux distincts.
La base GMAO Equaz n'a pas été utilisée ni modifiée. Les fichiers utiles sont
`infra/docker-compose.ovh.yml`, `infra/bootstrap-ovh.sh`,
`infra/verify-ovh.sh`, `infra/Caddyfile.memocycle` et
`infra/install-caddy-route.sh`.

## État Google OAuth

- Projet Google Cloud créé : `Memocycle`, ID `memocycle`.
- Google Auth Platform configuré pour l'application `MémoCycle`, audience
  externe et contact du propriétaire.
- Aucun Firebase Identity Platform ni service d'authentification payant n'est
  nécessaire pour cette intégration.
- Client Android créé : nom `MémoCycle Android production`, package
  `app.memocycle.mobile`, SHA-1
  `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25`.
- Client Web créé : `MémoCycle API`. Les origines et URI de redirection sont
  vides pour le flux natif actuel.
- Client ID Android :
  `575543516415-qjfv5cn3hfsjg241n63edgtp1rhjqmar.apps.googleusercontent.com`.
- Client ID Web :
  `575543516415-aaie2tg4vtqbshlf4r8k5vc98ngb181d.apps.googleusercontent.com`.
- Ces deux Client IDs publics sont actifs dans le `.env` OVH et dans le build
  mobile. Le secret du client Web n'est pas utilisé par l'application.
- Le compte Google du propriétaire a été ajouté comme utilisateur test le
  16 septembre 2026. Il peut se connecter pendant que l'application reste en
  mode `Test`.
- OAuth reste en mode `Test`. Le passage en production exige une page d'accueil,
  une politique de confidentialité et des conditions validées. Ne pas publier
  les textes provisoires présents dans `infra/public` comme documents juridiques.

Le script `infra/configure-google-ovh.sh` permet de remettre ces valeurs sur le
serveur et de recréer uniquement `memocycle-api`.

## Signature Android

Une clé de publication locale a été créée :

- `credentials/android/memocycle-release.jks`
- `credentials/android/keystore.properties`
- alias `memocycle`
- SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25`

Le dossier `credentials/` est ignoré par Git. Il doit être sauvegardé dans un
coffre privé : perdre cette clé empêcherait de publier une mise à jour portant
la même signature. Le plugin `apps/mobile/plugins/with-release-signing.js`
réapplique la signature après un `expo prebuild`.

## APK Android actuel

L'APK autonome final a été construit avec :

- `EXPO_PUBLIC_API_URL=https://memocycle.135-125-100-75.sslip.io`
- le Client ID OAuth Android de production ;
- le Client ID OAuth Web ;
- la clé de publication locale décrite ci-dessus.

Fichier local : `artifacts/memocycle-standalone.apk`.

- Taille : `115006331` octets.
- SHA-256 :
  `9FC83E008DCDDC92B51890BD4A8FC8AE42781AA39C396556A3179DC7CA55376D`.
- Signature APK v2 vérifiée avec le certificat MémoCycle et la SHA-1 attendue.
- Release : `v1.0.0-beta.1` sur GitHub :
  `https://github.com/bindarst/Memocycle/releases/tag/v1.0.0-beta.1`.
- Téléchargement direct :
  `https://github.com/bindarst/Memocycle/releases/download/v1.0.0-beta.1/memocycle-android-v1.0.0-beta.1.apk`.
- Installé avec succès sur un Samsung `SM-S938B` le 16 septembre 2026 après
  suppression de l'ancien build portant une signature incompatible.
- Android confirme `versionName=1.0.0`, `versionCode=1` et l'activité
  `app.memocycle.mobile/.MainActivity` visible au premier plan.

Étapes restantes :

1. Tester la connexion Google et une synchronisation complète contre l'API OVH
   depuis le téléphone où la version 1.0.0 est maintenant installée.
2. Finaliser puis publier les documents juridiques avant de passer OAuth en
   production pour tous les utilisateurs.

## Vérifications déjà obtenues

- TypeScript : réussi pour tous les workspaces.
- Tests métier et SQLite : 22/22.
- Tests d'intégration SQLite/PostgreSQL : 11/11.
- Expo Doctor : 21/21.
- Build Android natif autonome : réussi avec la signature de production.
- Installation et démarrage sur téléphone Android physique : réussis.
- URL OVH et client OAuth Web vérifiés dans le bundle Android.
- Signature v2 et certificat de production vérifiés avec `apksigner`.
- Déploiement OVH : API et PostgreSQL sains.
- Caddy et certificat Let's Encrypt : actifs.
- Les conteneurs Equaz contrôlés sont restés sains après le déploiement.
