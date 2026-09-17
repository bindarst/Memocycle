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
