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
   - Écran `/session/[courseId]` intégrant minuteur Pomodoro (25 min par défaut), rappel actif et notation finale.

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

Toutes les suites de vérification sont au vert (0 erreur TypeScript, 0 erreur ESLint, 31/31 tests passants).
