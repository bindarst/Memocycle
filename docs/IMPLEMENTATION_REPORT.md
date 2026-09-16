# Rapport Technique d'Implémentation

**Projet** : MémoCycle — Assistant d'Études Personnel  
**Date** : Septembre 2026  
**Statut** : Terminé & Validé (Tests 100% verts, TypeScript 0 erreur, ESLint 0 warning)

---

## 1. Intégrations Terminées

1. **Fournisseurs de Calendrier** :
   - **Google Calendar (API v3)** : Liste des calendriers, création, mise à jour, suppression d'événements, synchronisation, révocation de token.
   - **Microsoft Outlook (Graph API)** : Liste des calendriers, gestion complète des événements de calendrier, révocation.
   - **Calendrier Local du Téléphone (Expo / React Native)** : Intégration permission-safe native du calendrier système avec déconnexion et fallbacks hors ligne.
   - **Export Universel RFC 5545 (`.ics`)** : Génération standardisée de fichiers calendrier importables dans Apple Calendar, Thunderbird, etc.
2. **Gestion Intelligente du Planning & Disponibilités** :
   - Détection des conflits horaires (`detectCalendarConflicts`).
   - Moteur de suggestion de créneaux alternatifs (`suggestAlternativeStudySlots`).
   - Planificateur d'étude hebdomadaire (`buildStudySchedule`).
   - Équilibrage automatique de la charge de révisions (`balanceReviewWorkload`).
3. **Moteur Pédagogique & Méthodes d'Apprentissage** :
   - 7 méthodes d'apprentissage modélisées (`passive_reading`, `active_reading`, `self_explanation`, `free_recall`, `cued_recall`, `practice_problems`, `worked_example`).
   - Recommandation adaptative selon type de contenu, connaissances initiales et stade d'apprentissage FSRS.
   - Mode de sélection automatique ou manuel avec méthode favorite par cours.
   - Mode révision volontaire (`voluntary_review`) sans perturbation du cycle FSRS.
   - Suivi de la durée réelle de session (`durationSeconds`).
4. **Vues & Ergonomie Mobile** :
   - Vues Planning unifiées : `Agenda`, `Semaine` et `Mois`.
   - Distinction visuelle discrète par icônes dédiées (Mémoire pour révision, Diplôme pour examen, Horloge pour session, Calendrier pour externe).
   - Boîte « À planifier » pour cours et examens sans session prévue.
   - Tableau de bord étudiant synthétique sur `today.tsx`.
   - Écran de paramétrage des calendriers (`/settings/calendar`).

---

## 2. Scopes OAuth & Sécurité des Données

| Fournisseur | Scopes Utilisés | Justification & Règle de Moindre Privilège |
| :--- | :--- | :--- |
| **Authentification MémoCycle** | `openid`, `profile`, `email` | Connexion utilisateur uniquement. Aucun accès calendrier. |
| **Google Calendar** | `https://www.googleapis.com/auth/calendar.events` | Gestion exclusive des événements de calendrier. **Aucun accès Gmail**. |
| **Microsoft Outlook** | `Calendars.ReadWrite` | Gestion exclusive des événements de calendrier. **Aucun accès Outlook Mail**. |
| **Calendrier Téléphone** | Permission native `READ_CALENDAR` / `WRITE_CALENDAR` | Demandée uniquement sur action explicite de l'étudiant. |

### Chiffrement au Repos (AES-256-GCM)
- Service : `apps/api/src/integrations/calendar/calendar-crypto.service.ts`
- Format : `IV (12 bytes) : AuthTag (16 bytes) : Ciphertext`
- Tous les refresh tokens et access tokens OAuth sont chiffrés au repos avant écriture dans PostgreSQL.
- Masquage systématique des tokens dans les journaux applicatifs.

---

## 3. Schémas & Migrations

### Prisma / PostgreSQL (`apps/api/prisma/schema.prisma`)
- **`CalendarConnection`** : Stocke les connexions actives, identifiants de compte, mode de sync (`disabled`, `export_only`, `two_way`), tokens chiffrés et dates d'expiration.
- **`CalendarEventLink`** : Mappe les entités MémoCycle locales (`review`, `exam`, `study_session`) avec les identifiants d'événements externes afin d'éviter tout doublon.
- **`StudySession`** : Modélise les sessions d'étude planifiées et réalisées.
- **`Course` & `ReviewEvent`** : Enrichis avec les métadonnées pédagogiques (`preferredStudyMethod`, `methodSelectionMode`, `contentType`, `priorKnowledge`, `targetDate`, `weeklyStudyTargetMinutes`, `priority`, `examIds`, `tags`, `durationSeconds`, `sessionType`, `studyMethod`).

### SQLite Mobile (`apps/mobile/src/database/`)
- Migration **v4** : Table `study_sessions` avec colonnes virtuelles (`planned_start_at`, `completed_at`), index optimisés et triggers de suppression en cascade.
- `schema.ts` : Ajout de la table `study_sessions` et de la colonne virtuelle `planned_start_at`.
- `entities.ts` : Typages Zod `studySessionEntitySchema`, `StudySession`, et enrichissements `courseSchema` / `eventSchema`.

---

## 4. Écrans & Composants Ajoutés / Modifiés

| Écran / Composant | Fichier | Rôle |
| :--- | :--- | :--- |
| **Paramètres Calendriers** | `apps/mobile/app/settings/calendar.tsx` | Connexion/déconnexion Google, Outlook, Téléphone, modes de sync, disponibilités, export `.ics`. |
| **Planning Unifié** | `apps/mobile/app/(tabs)/calendar.tsx` | Modes Agenda/Semaine/Mois, icônes discrètes, alertes et résolutions de conflits, boîte « À planifier ». |
| **Tableau de Bord Étudiant** | `apps/mobile/app/(tabs)/today.tsx` | Synthèse des révisions, temps total prévu, compte à rebours examen, alertes de conflits, sessions du jour. |
| **Détail du Cours** | `apps/mobile/app/course/[id].tsx` | Bouton rapide « Planifier », révision volontaire « Réviser maintenant », historique compact des méthodes utilisées. |
| **Session de Révision** | `apps/mobile/app/review/[courseId].tsx` | Chip de méthode recommandée/interchangeable, chronométrage `durationSeconds`, validation FSRS. |
| **Formulaire Cours** | `apps/mobile/src/ui/CourseForm.tsx` | Options avancées : type de contenu, connaissances préalables, méthode favorite, priorité, examens liés, tags. |
| **Profil Utilisateur** | `apps/mobile/app/(tabs)/profile.tsx` | Accès compact au menu Calendriers dans la section Préférences. |

---

## 5. Suite de Tests Validée

```bash
✓ tests/memoryModel.test.ts (2 tests)
✓ tests/studyMethods.test.ts (9 tests)
✓ tests/sessionStorage.test.ts (2 tests)
✓ tests/reviewSchedule.test.ts (13 tests)
✓ tests/offline.test.ts (7 tests)
✓ tests/calendarIntegration.test.ts (9 tests)
✓ tests/googleAuth.test.ts (7 tests)

Test Files: 7 passed (7)
Tests:      49 passed (49)
```

- **Tests Calendrier (`tests/calendarIntegration.test.ts`)** : Chiffrement/déchiffrement AES-256-GCM, masquage des tokens, détection des chevauchements, propositions de créneaux alternatifs, export `.ics`, règles d'invariance FSRS en mode `export_only` et `two_way`, fonctionnement 100% hors connexion.
- **Tests Méthodes (`tests/studyMethods.test.ts`)** : Calcul des stades d'apprentissage, moteur de recommandation selon type de contenu et connaissances préalables, mode manuel vs automatique, invariance mathématique des calculs FSRS.

---

## 6. Limitations Restantes & Perspectives Futures

1. **Pièces jointes de cours (`CourseAttachment`)** : Les contrats et structures ont été préparés dans `@memocycle/contracts` pour supporter de futurs uploads de documents (PDF, schémas, audio) sans bloquer le modèle actuel.
2. **Serveurs Webhooks Google / Outlook push** : La synchronisation utilise actuellement le cycle de synchronisation offline-first de MémoCycle et les requêtes périodiques/à la demande. L'implémentation de webhooks de notification push bidirectionnelle en quasi-temps réel pourra être activée ultérieurement sur le cluster API.
