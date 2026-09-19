# Reprise du projet MémoCycle

Dernière mise à jour : 17 septembre 2026.

Ce document est la source de vérité pour reprendre le projet. Ne jamais ajouter
de mot de passe, de secret JWT, de fichier `.env`, de clé privée ou de keystore
dans Git. Mettre ce document et le README à jour après chaque changement de
livraison ou d'infrastructure.

## Dépôt et architecture

- Dépôt public : `https://github.com/bindarst/Memocycle`, branche `main`.
- Mobile : Expo/React Native natif, package Android `app.memocycle.mobile`.
- API : NestJS, préfixe `/v1`.
- Données locales : SQLite avec synchronisation par outbox (`studyItem`, `course`, `subject`, `module`, `reviewPlan`, `reviewEvent`, `exam`, `userSettings`).
- Données serveur : PostgreSQL géré par Prisma.
- Moteur mémoire : FSRS (Free Spaced Repetition Scheduler via `ts-fsrs`) avec maintien rétro-compatible du moteur `classic`.

## Nouveautés Majeures du Moteur d'Apprentissage

1. **Moteur FSRS Adaptatif** :
   - Calcul dynamique des intervalles de révision basé sur la rétention cible (`desiredRetention = 0.90`), la stabilité et la difficulté.
   - 4 niveaux d'évaluation : *Oublié (`again`)*, *Difficile (`hard`)*, *Bien (`good`)*, *Facile (`easy`)*.
   - Les anciens plannings restent sur `schedulerType: "classic"` sans altération d'historique.

2. **Unités d'Apprentissage (`StudyItem`)** :
   - Prise en charge des types `flashcard`, `question`, `cloze`, `note`.
   - Synchronisation complète via l'outbox SQLite $\rightarrow$ `/v1/sync` $\rightarrow$ PostgreSQL $\rightarrow$ autres appareils.

3. **Planificateur Quotidien & Équilibrage de Charge** :
   - Priorisation intelligente (`dailyPlanner.ts`) prenant en compte l'urgence, la rétention estimée, et la proximité des examens (planification à rebours).
   - Équilibrage de charge (`workloadBalancer.ts`) avec détection de surcharges et redistribution automatique sécurisée.

4. **Sessions Guidées & Focus** :
   - Écran `/session/[courseId]` intégrant minuteur Focus ou chrono libre, rappel actif et notation finale.
   - Le chrono est stocké localement dans `study_timers` (migration SQLite v5), isolé par utilisateur et cours. Un horodatage de départ permet de retrouver le temps exact après navigation, veille ou redémarrage. La fin de session efface le chrono, la déconnexion avec effacement du compte aussi.
   - `/review/[courseId]` n'appelle plus de hook conditionnel au chargement : le bouton « Réviser » n'entraîne plus l'erreur React liée à l'ordre des hooks.
   - La validation d'une session utilise `start`, `complete` ou `restart` selon l'état du planning, évitant un accès à un planning absent.

5. **Expérience Produit Enrichie** :
   - Tableau de bord *Aujourd'hui* avec section *À consolider*, progression, streak sobre et actions rapides.
   - Calendrier avec vue *Semaine*, charge journalière estimée et bouton de répartition automatique.
   - Bibliothèque avec filtres multiples (*À apprendre*, *À réviser*, *En retard*, *Maîtrisés*, *Archivés*) et tris.
   - Statistiques complètes avec filtres temporels (7j, 30j, 90j, Tout), matières fragiles et heatmap d'activité.
   - Système de notifications avec snooze (15 min, 1 h, lendemain) et heures calmes.

## État OVH & Déploiement

- VPS : `135.125.100.75`, utilisateur SSH `ubuntu`.
- Projet serveur : `/home/ubuntu/Memocycle`.
- API publique : `https://memocycle.135-125-100-75.sslip.io`.
- Migration PostgreSQL de schéma `202609160001_learning_engine` prête à être déployée avec `npm run db:migrate`.

## Commandes de Validation Complète

```sh
# 1. Compilation
npm run build

# 2. Vérification statique des types
npm run typecheck

# 3. Linter ESLint
npm run lint

# 4. Tests unitaires et offline (Vitest)
npm test
```

Vérifications du 17 septembre : 0 erreur TypeScript, 0 erreur ESLint, 60/60 tests passants (dont horloge après fermeture et persistance SQLite).

## Livrable Android 1.0.1

- `apps/mobile/app.config.ts` : version 1.0.1, `android.versionCode: 2`. Garder le même keystore de production pour les mises à jour.
- Le dossier natif `apps/mobile/android` est ignoré par Git. Après un nouveau `expo prebuild`, vérifier le numéro de version et la signature avant de reconstruire.
- APK signé : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.1.apk` (copie également dans `app-release.apk` pour la continuité des anciens liens OneDrive).
- APK vérifié avec `aapt`/`apksigner` : package `app.memocycle.mobile`, versionCode 2, versionName 1.0.1 ; signature de production inchangée. SHA-256 : `39AF35C0E65DE7283622E961255BF153907D4E6E29A029C06B5635B31A776E80`, identique dans OneDrive.
- Le test manuel sur un téléphone requiert un appareil ADB connecté ; aucun appareil n'était visible lors de cette intervention. Faire un essai « Réviser », puis démarrer un chrono, quitter l'application, attendre et rouvrir le même cours.

## Historique Android 1.0.2

- `app/settings/help.tsx` est accessible par Profil > Aide et FAQ : 10 rubriques, recherche sans accents, réponses repliables et liens vers les fonctions décrites. Le contenu statique dans `src/help/helpContent.ts` fonctionne hors ligne.
- Cette version comportait des pages Confidentialité et Conditions provisoires. Elles ont été retirées dans la version 1.0.3 à la demande de l'éditeur, avec tous leurs liens dans l'application et les deux modèles HTML du dépôt.
- Configuration mobile : version 1.0.2, `android.versionCode: 3`. Le dossier `apps/mobile/android` est ignoré par Git ; vérifier la version native et le keystore après tout `expo prebuild`.
- Validation : 63/63 tests, TypeScript et ESLint sans erreur, `assembleRelease` réussi. APK signé vérifié avec `aapt` et `apksigner`, signature SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25` inchangée. SHA-256 `C09BE1F1DA197E4008EDDD6B1FE767154664DEA601639A06862E4E35507EEE0E`, identique dans `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.2.apk` et `app-release.apk`.
- Aucun appareil ADB visible au moment de ce build : ouverture de l’aide à vérifier manuellement après installation.

## Android 1.0.3 — retrait des pages juridiques

- L'aide et sa FAQ hors ligne restent dans Profil > Aide et FAQ. Le contenu « Compte, données et sécurité » répond maintenant explicitement à « Où sont sauvegardées mes données ? ».
- Les routes natives `app/legal/*`, le contenu `src/legal/*`, les boutons Confidentialité/Conditions de l'accueil, du profil et de l'aide, ainsi que les modèles `infra/public/privacy` et `infra/public/terms` ont été supprimés. La page fonctionnelle de suppression du compte reste disponible.
- Les cours, fiches, révisions et réglages sont enregistrés localement dans `memocycle.db` (SQLite) et synchronisés, après connexion, avec PostgreSQL dans le conteneur `memocycle-postgres` sur OVH, volume `memocycle-postgres-data`. Cette base est dédiée à MémoCycle et séparée de la GMAO Equaz. L'identification Google ne stocke pas les cours. Les chronos restent locaux.
- Synchroniser avant de désinstaller ou de changer de téléphone. Le volume OVH et la synchronisation ne remplacent pas une sauvegarde indépendante. `infra/backup.sh` et les unités systemd sont fournis, mais l'installation du timer, l'exécution de sauvegardes et une restauration ne sont pas vérifiées. Le script vise `docker-compose.production.yml`, alors que le déploiement décrit utilise `docker-compose.ovh.yml` ; l'aligner avant toute activation.
- Configuration mobile : version 1.0.3, `android.versionCode: 4`. Le dossier natif `apps/mobile/android` est ignoré par Git ; vérifier version native et keystore avant chaque build.
- Résultats de validation, signature et empreinte APK : voir `docs/RELEASE_NOTES_v1.0.3.md`.

## Android 1.0.4 — examens et PDF locaux

- `src/ui/ExamDatePicker.tsx` remplace la saisie clavier de la date des examens par un calendrier mensuel, des raccourcis Aujourd'hui/Demain/+7 jours et des heures rapides. `EntityForm` l'utilise pour créer et modifier les examens ; les écrans matière et module proposent désormais Modifier sur chaque examen.
- Les PDF peuvent être joints aux matières, aux cours et aux fiches depuis leurs écrans. `src/pdf/localPdfs.ts` copie les fichiers dans `Paths.document/memocycle-pdfs/<userId>/` et conserve leurs métadonnées dans la table SQLite `local_pdf_attachments` (migration locale v6). Cette table n'est pas une entité synchronisée et les PDF ne sont pas envoyés à l'API ou à OVH. Les PDF sont limités à 50 Mo par fichier.
- Les PDF sont ouverts via la feuille système de partage/lecture. Une mise à jour de l'APK par-dessus la version précédente conserve les fichiers ; une déconnexion ou une désinstallation les supprime. Android `allowBackup: false` désactive leur sauvegarde automatique par l'OS. Les PDF d'un parent supprimé sont effacés localement.
- Les dates d'examen et autres données métier continuent à être synchronisées sur PostgreSQL OVH. Une demande de clarification a été envoyée pour savoir si l'éditeur veut aussi supprimer cette synchronisation ; aucune migration des données métier vers un mode exclusivement local n'a été faite dans cette version.
- Configuration : version 1.0.4, `android.versionCode: 5`; `expo-file-system` et `expo-sharing` sont des dépendances directes. Le dossier natif Android reste ignoré par Git ; vérifier le manifeste `allowBackup=false` et la signature au build.
- Résultats de validation et empreinte APK : voir `docs/RELEASE_NOTES_v1.0.4.md`.

## iPhone / Expo au 17 septembre 2026

- Projet Expo créé et lié : `https://expo.dev/accounts/bindarst/projects/memocycle`, ID EAS `3390691f-af2b-4a28-b94d-c99a9910385d`. `app.config.ts` définit `owner`, `extra.eas.projectId` et le bundle ID `app.memocycle.mobile`. `eas.json` contient l'URL API publique et les Client IDs publics nécessaires au build distant ; aucun secret n'y est ajouté.
- `npx expo export --platform ios` a produit le bundle Hermes iOS. La tentative `eas build --platform ios --profile preview --non-interactive --no-wait` s'est arrêtée avant compilation distante : aucun certificat/profil Apple pour la distribution interne. L'éditeur a indiqué ne pas avoir d'abonnement Apple Developer. Aucun `.ipa` installable n'existe.
- Expo Go iPhone depuis l'App Store s'arrête au SDK 54, alors que le projet utilise SDK 57 et `react-native-nitro-google-signin` (module natif non embarqué par Expo Go). Le compte Expo gratuit ne remplace pas la signature Apple. Si l'éditeur souscrit au programme Apple, créer les identifiants de signature, enregistrer l'iPhone pour le profil ad hoc, puis relancer EAS. L'autre voie de développement sans abonnement nécessite un Mac/Xcode et un appareil relié pour le build local.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` est absent. L'accueil masque donc Google sur iOS jusqu'à sa configuration ; Apple Sign-In côté appareil/serveur n'est pas validé. Avant livraison iPhone, vérifier aussi l'exclusion des PDF locaux de la sauvegarde iCloud, ainsi que l'importation/lecture/suppression des PDF sur appareil réel.

## Android 1.0.5 et publication Google Play

- MémoCycle a été créée comme application distincte dans le compte Play Console personnel « Bindarst » (ID Play `4972354992207967892`, package `app.memocycle.mobile`). La GMAO « Iso Care Maint » (`com.equaz.mobile`) n'a pas été modifiée. La version 1.0.5, code 6, est publiée sur le canal de test interne actif pour la liste `interne`, qui contient uniquement `bindarst2011@gmail.com`. Lien d'inscription : `https://play.google.com/apps/internaltest/4701281405599427540`.
- Android `versionCode: 6`, `versionName: 1.0.5`, `targetSdkVersion: 36`. `SYSTEM_ALERT_WINDOW` est bloquée dans `app.config.ts` et le manifeste natif ignoré. `:app:bundleRelease :app:assembleRelease` réussit. APK et AAB signés avec le certificat historique SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25`, disponibles dans `artifacts/` et `C:\Users\Adminpc\OneDrive\Memocycle\` sous `Memocycle-v1.0.5.apk` et `.aab`. L'APK SHA-256 est `10C62C655653AF28FD5E97C3DE89ADBBD3D96B0A4470A77AD4D463284EC727F4` ; l'AAB SHA-256 est `012315B97F87E18309669928C2E1DB659FE2E2BABD9DF4F5D1A47DAECC17F176`.
- La politique et la page de demande de suppression sont implémentées sur l'API aux routes publiques `/v1/public/privacy` et `/v1/public/delete-account`. Le contact public confirmé est `bindarst2011@gmail.com`. L'application relie la politique depuis l'accueil et le profil. L'API a été déployée sur OVH le 17 septembre après sauvegarde privée `/home/ubuntu/memocycle-backups/pre-play-20260917.dump` de la seule base MémoCycle et application de la migration additive `202609160001_learning_engine`. Seul `memocycle-api` a été redémarré ; `/v1/health` et les deux pages publiques répondent en HTTPS 200.
- Un smoke test API a révélé un défaut d'injection de `AccessTokenGuard` dans `CalendarModule`, corrigé avec l'import JWT et le fournisseur local. Le préfixe calendrier doublé `v1/v1` et l'accès `req.user` incorrect sont corrigés. Avec une PostgreSQL temporaire isolée, l'API démarre ; `/v1/health`, `/v1/public/privacy`, `/v1/public/delete-account` renvoient 200 et la route calendrier sans jeton 401.
- La fiche Play peut utiliser `store-assets/icon-512.png` et `store-assets/feature-graphic.png`. Il manque encore de vraies captures d'écran et les déclarations de contenu. Play Console impose explicitement un test fermé avec au moins 12 testeurs inscrits sans interruption pendant 14 jours avant la demande d'accès à la production. Google a généré une clé de signature d'application SHA-256 `94:D9:5D:5C:F8:6A:FB:8E:74:17:F5:1F:7A:66:5B:79:87:56:98:B5:6F:DE:C8:59:8D:70:5A:F2:9F:B5:F5:7B`, différente de la clé historique utilisée par l'APK direct. Une installation directe existante devra donc vraisemblablement être désinstallée avant la première installation Play, ce qui peut supprimer ses PDF locaux. Voir `docs/PLAY_STORE_SUBMISSION_GUIDE.md`.
- Google Auth Platform, projet `memocycle` : état **Test**, seul `bindarst2011@gmail.com` est dans les utilisateurs tests. Aucun niveau d'accès sensible ou restreint n'apparaît dans la console et le code mobile demande un jeton d'identité. La [documentation Google sur l'audience OAuth](https://support.google.com/cloud/answer/15549945?hl=fr) dit explicitement que l'exception pour « Se connecter avec Google » limité au nom, e-mail et profil permet aux comptes non listés de se connecter sans avertissement ni expiration à sept jours. Cela retire le domaine personnel comme préalable technique à la première diffusion, mais l'authentification reste à essayer sur un autre compte Android. Le branding complet n'est pas publié ; la page d'accueil HTML `/v1/public`, la confidentialité et `/v1/health` répondent en HTTPS 200 sur OVH.

## Android 1.0.6

- Nouvelle icône graphite, cobalt et blanche, avec variantes classique et adaptative. Sources SVG et script reproductible `scripts/render-mobile-icons.mjs`.
- `versionCode: 7`, `versionName: 1.0.6`. APK et AAB signés dans `artifacts/`. TypeScript, 66 tests, `bundleRelease` et `assembleRelease` réussissent.
- Cause de l'échec Google sur la version Play : le client OAuth Android existant était associé à la clé historique de l'APK direct, alors que Google Play signe les téléchargements avec sa propre clé. Le client `MémoCycle Android Google Play` a été créé pour `app.memocycle.mobile`, SHA-1 `05:16:EF:26:8E:8D:4A:00:BD:86:B9:4F:9B:50:08:36:D7:C3:D9:3C`, ID `575543516415-5po2mo03pgjn5mp56396v51e4h06a9ue.apps.googleusercontent.com`.
- La release `7 (1.0.6)` est publiée sur le canal de test interne et affichée « Accessible aux testeurs internes » depuis le 19 septembre 2026 à 13:12. Lien inchangé : `https://play.google.com/apps/internaltest/4701281405599427540`. Google indique que la propagation peut prendre jusqu'à une heure.
