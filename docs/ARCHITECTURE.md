# MémoCycle : Architecture & Décisions Techniques

## 1. Sources de Vérité & Offline-First

- **Client Mobile** : Base de données SQLite locale (`expo-sqlite`). Toutes les fonctions clés (consultation des cours, sessions de révision, création de flashcards/questions, gestion de l'agenda, calculs FSRS) fonctionnent **100 % hors connexion**.
- **Serveur API** : Base PostgreSQL gérée par Prisma via l'API NestJS.
- **Synchronisation outbox** : Toute mutation locale génère une entrée d'outbox appliquée vers `/v1/sync`. Le serveur applique les transactions de façon sérialisée par utilisateur, incrémente `syncSequence` et retourne les mutations acquittées et les nouveaux changements dans le change log.
- **Sécurité & Multi-Appareils** : Isolation stricte par `owner_user_id`. Aucune fuite de données entre comptes. Idempotence garantie par UUID v4 et hash des requêtes.

---

## 2. Moteur Mémoire Adaptatif (FSRS-6) & Coexistence Classic

### Coexistence Transparente
- `schedulerType: "classic"` : Conserve exactement l'algorithme historique à 6 étapes fixes (intervalles 24h, 72h, 168h, 336h, 720h, 1440h).
- `schedulerType: "fsrs"` : Utilise le modèle FSRS moderne (via la bibliothèque certifiée `ts-fsrs`) pour adapter dynamiquement la prochaine date de révision à la difficulté et à la rétention de l'étudiant.
- Les anciens cours restent en mode "classic" sans rupture. Les nouveaux cours bénéficient du moteur adaptatif FSRS avec une rétention cible par défaut (`desiredRetention = 0.90`, configurable entre 0.80 et 0.97).

### Auto-Évaluation Active & Notation
Lors des sessions de rappel actif, l'étudiant évalue sa réponse parmi 4 choix :
- **Oublié (`again`)** : Rapproche l'échéance, réinitialise la stabilité et incrémente `lapses`.
- **Difficile (`hard`)** : Augmente modérément l'intervalle avec un facteur de difficulté plus élevé.
- **Bien (`good`)** : Progresse normalement sur la courbe d'espacement.
- **Facile (`easy`)** : Repousse l'échéance plus loin et augmente la stabilité mémoire.

La notation globale d'une session contenant plusieurs fiches applique une règle conservatrice (si $\ge 25\%$ d'oublis $\rightarrow$ `again`, si majorité `hard` $\rightarrow$ `hard`, si $\ge 70\%$ `easy` $\rightarrow$ `easy`, sinon `good`).

---

## 3. Unités d'Apprentissage (`StudyItem`)

L'entité `StudyItem` permet d'associer des contenus d'étude précis à un cours :
- `flashcard` : Recto (question/concept) + Verso (définition/formule).
- `question` : Question ciblée + Réponse.
- `cloze` : Texte à trous avec masquage progressif.
- `note` : Note ou rappel conceptuel.

**Synchronisation unifiée** : `studyItem` transite par le même système de synchronisation outbox, sans API ni protocole secondaire. La suppression d'un cours entraîne la suppression en cascade de ses fiches.

---

## 4. Planificateur Quotidien Intelligent & Équilibrage de Charge

### Plan Quotidien (`dailyPlanner.ts`)
Calcule un score de priorité basé sur :
1. Le retard de la révision (urgence critique).
2. Le risque d'oubli calculé par le modèle FSRS (si la rétention estimée passe sous le seuil).
3. La proximité d'un examen (`Exam`) associé à la matière : planification à rebours augmentant progressivement la priorité des cours dans les 30 jours précédant l'épreuve.
4. L'importance du cours (1 à 3 étoiles) et le temps d'étude cible configuré (15 à 120 minutes quotidiennes).

Les révisions échues ne sont jamais masquées.

### Équilibrage de Charge (`workloadBalancer.ts`)
- Détecte les journées surchargées sur un horizon de 14 jours.
- Propose un lissage automatique en décalant uniquement les révisions non urgentes dont la mémoire estimée est solide ($\ge 87\%$).
- Fournit un indicateur d'impact transparent (*Peu d'impact*, *Impact modéré*, *Déconseillé*).
- Ne déplace jamais les dates d'examens.

---

## 5. Sessions d'Étude Guidées (`/session/[courseId]`)

- Chronomètre interactif avec **Mode Focus Pomodoro** (25 minutes par défaut, configurable 15, 25, 45, 60 min).
- Parcours de rappel actif complet avec masquage de réponse et boutons d'évaluation.
- Validation explicite : interrompre une session ne valide jamais artificiellement une révision.

---

## 6. Notifications & Confort d'Étude

- Catégories de notifications : `review_due`, `review_overdue`, `exam_upcoming`, `daily_plan`.
- Actions rapides : `REVIEW_NOW`, `SNOOZE_15` (15 min), `SNOOZE_60` (1 h), `SNOOZE_TOMORROW` (lendemain).
- **Heures calmes** (`quietHoursStart`, `quietHoursEnd`) configurables pour éviter les sonneries intempestives la nuit.
- Reporter une notification ne modifie pas le planning mémoire ; seul le rappel local est différé.

---

## 7. Migrations & Intégrité des Données

- **PostgreSQL** : Migration non-destructive `202609160001_learning_engine` ajoutant `desiredRetention`, `difficulty`, `stability`, `retrievability`, `scheduledDays`, `elapsedDays`, `reps`, `lapses`, `lastRating` sur `review_plans`, et création de la table `study_items`.
- **SQLite** : Migration v3 créant la table `study_items` et les index associés `study_items_course`.
- **Historique intègre** : Les anciens `ReviewEvent` ne sont jamais recalculés rétroactivement.
