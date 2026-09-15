# Reprise du projet MémoCycle

Dernière mise à jour : 15 septembre 2026.

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
- Le formulaire du client Android est préparé dans Google Cloud mais son bouton
  `Créer` n'a pas encore été validé.
- Client Android à créer : nom `MémoCycle Android production`, package
  `app.memocycle.mobile`, SHA-1
  `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25`.
- Créer ensuite un client OAuth de type Application Web nommé
  `MémoCycle API`. Les origines et URI de redirection peuvent rester vides pour
  le flux natif actuel.
- Copier les deux Client IDs publics. Ne pas créer ni conserver de secret OAuth
  dans l'application mobile.

Après leur création, renseigner sur OVH `GOOGLE_ANDROID_CLIENT_ID` et
`GOOGLE_WEB_CLIENT_ID` dans le `.env` serveur, puis recréer seulement le
conteneur `memocycle-api`. Fournir les mêmes valeurs au build mobile avec
`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` et
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

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

## APK et rebuild restant

L'APK actuellement installé est autonome, mais il a été signé avec la clé de
test Android et embarque l'ancienne URL `https://api.memocycle.app`. Il doit donc
être remplacé. Le dernier build doit intégrer :

- `EXPO_PUBLIC_API_URL=https://memocycle.135-125-100-75.sslip.io`
- le Client ID OAuth Android de production ;
- le Client ID OAuth Web ;
- la clé de publication locale décrite ci-dessus.

Étapes restantes :

1. Créer les deux Client IDs OAuth dans Google Cloud.
2. Mettre à jour le `.env` OVH et redémarrer uniquement `memocycle-api`.
3. Exécuter `npx expo prebuild --platform android`, puis construire
   `assembleRelease` avec Java 17 et le SDK Android.
4. Copier l'APK final dans `artifacts/memocycle-standalone.apk`.
5. Installer l'APK sur un téléphone, tester la connexion Google et une
   synchronisation complète contre l'API OVH.
6. Publier l'APK comme asset d'une GitHub Release. Les APK sont exclus du dépôt
   car l'artefact dépasse la limite habituelle d'un fichier GitHub.
7. Mettre à jour ce document, `README.md` et `docs/RELEASE.md`, puis pousser le
   commit final.

## Vérifications déjà obtenues

- TypeScript : réussi pour tous les workspaces.
- Tests métier et SQLite : 22/22.
- Tests d'intégration SQLite/PostgreSQL : 11/11.
- Expo Doctor : 21/21.
- Build Android natif autonome : réussi avec la signature de test.
- Déploiement OVH : API et PostgreSQL sains.
- Caddy et certificat Let's Encrypt : actifs.
- Les conteneurs Equaz contrôlés sont restés sains après le déploiement.
