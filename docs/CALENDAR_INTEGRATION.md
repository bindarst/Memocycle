# Intégration Calendrier MémoCycle

Ce document détaille l'architecture, la sécurité, les flux de données et les règles d'invariance pour les intégrations de calendriers externes dans MémoCycle.

---

## 1. Principes Fondamentaux & Souveraineté des Données

1. **Optionnel par design** : Aucune intégration calendrier n'est obligatoire. MémoCycle fonctionne à 100% en mode hors connexion autonome via sa base SQLite locale.
2. **Consentement explicite & isolation OAuth** :
   - L'authentification Google existante pour la connexion à MémoCycle (`openid`, `profile`, `email`) n'accorde **aucun** accès au calendrier.
   - La synchronisation Google Calendar nécessite une action volontaire distincte de l'utilisateur ("Connecter Google Agenda") demandant uniquement le scope `https://www.googleapis.com/auth/calendar.events`.
   - L'intégration Microsoft Outlook utilise Microsoft Graph avec le scope strict `Calendars.ReadWrite`.
   - Aucun accès aux emails (Gmail ou Outlook) n'est jamais demandé.
3. **Source de vérité & Invariance FSRS** :
   - Pour les révisions (`review`), examens (`exam`) et sessions d'étude (`study_session`), **MémoCycle est la source de vérité**.
   - Pour les événements externes (`external`), Google Calendar, Microsoft Outlook ou le calendrier système local est la source de vérité.
   - Les événements externes fournissent des informations d'indisponibilité (créneaux occupés / libres) et ne modifient **jamais** les paramètres de mémoire FSRS (`difficulty`, `stability`, `retrievability`, `reps`, `lapses`, `rating`, `learningStage`).

---

## 2. Modes de Synchronisation

| Mode | Identifiant Contrat | Description |
| :--- | :--- | :--- |
| **Désactivée** | `disabled` | Aucune interaction avec le calendrier externe. |
| **Exporter MémoCycle** | `export_only` | MémoCycle publie et met à jour ses révisions/examens/sessions dans le calendrier distant sans lire les événements personnels de l'utilisateur. |
| **Synchronisation bidirectionnelle** | `two_way` | MémoCycle publie ses activités et lit les événements externes uniquement pour détecter les conflits horaires et proposer des créneaux alternatifs. Un événement externe ne supprime jamais une révision MémoCycle. |

---

## 3. Fournisseurs Supportés

### A. Google Calendar API (v3)
- **Service API** : `apps/api/src/integrations/calendar/google-calendar.service.ts`
- **Scope OAuth** : `https://www.googleapis.com/auth/calendar.events`
- **Capacités** : `listCalendars()`, `createEvent()`, `updateEvent()`, `deleteEvent()`, `listEvents()`, `revokeAccess()`.

### B. Microsoft Outlook / Graph API
- **Service API** : `apps/api/src/integrations/calendar/microsoft-calendar.service.ts`
- **Scope OAuth** : `Calendars.ReadWrite`
- **Capacités** : `listCalendars()`, `createEvent()`, `updateEvent()`, `deleteEvent()`, `listEvents()`, `disconnect()`.

### C. Calendrier Local du Téléphone (Expo / React Native)
- **Service Mobile** : `apps/mobile/src/calendar/localCalendarService.ts`
- **Permissions** : Demandées uniquement lors de l'activation explicite par l'utilisateur. En cas de refus, l'application continue sans altération.

### D. Export RFC 5545 (.ics)
- **Contrat & Générateur** : `packages/contracts/src/calendar.ts` -> `generateIcsCalendar(...)`
- **Compatibilité** : Apple Calendar, Thunderbird, Proton Calendar, Fastmail, etc.
- **Sécurité** : Aucun token, mot de passe ou métadonnée privée sensible n'est injecté dans le fichier `.ics`.

---

## 4. Sécurité, Chiffrement & RGPD

1. **Chiffrement au repos (AES-256-GCM)** :
   - Service : `apps/api/src/integrations/calendar/calendar-crypto.service.ts`
   - Clé dérivée : `CALENDAR_TOKEN_ENCRYPTION_KEY` (256 bits).
   - Format de stockage : `IV (12 bytes) : AuthTag (16 bytes) : Ciphertext`
   - Les tokens de rafraîchissement (`encryptedRefreshToken`) et d'accès ne sont **jamais** stockés en clair en base PostgreSQL.
2. **Audit & Journalisation** :
   - Masquage systématique des tokens dans les logs applicatifs (`ya29...4821`).
   - Aucun contenu privé complet d'événement externe n'est conservé au-delà de la session de planification.
3. **Déconnexion propre** :
   - Lors de la déconnexion d'un compte, les tokens sont révoqués auprès du fournisseur OAuth puis purgés de la base de données.
   - L'utilisateur choisit explicitement de **Conserver** ou **Supprimer** les événements MémoCycle déjà créés dans le calendrier externe.
   - Les événements personnels créés par l'utilisateur ne sont jamais supprimés.

---

## 5. Gestion des Conflits Horaires

- **Détection** : `detectCalendarConflicts(...)` compare les intervalles des sessions MémoCycle et les créneaux externes marqués comme `busy`.
- **Suggestions alternatives** : `suggestAlternativeStudySlots(...)` recherche des plages libres respectant :
  - L'heure préférée d'étude (`preferredStudyTime`, par défaut 18:00).
  - L'objectif quotidien (`dailyStudyMinutes`).
  - Les disponibilités hebdomadaires (`studyAvailability`).
- **Validation** : MémoCycle ne déplace **jamais** un événement sans confirmation explicite de l'étudiant.
