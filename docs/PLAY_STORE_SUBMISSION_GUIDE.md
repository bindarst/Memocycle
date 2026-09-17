# Guide Complet de Publication Google Play Store — MémoCycle

Ce document contient l'ensemble des éléments techniques, des textes officiels et des réponses aux questionnaires nécessaires pour soumettre **MémoCycle** sur le **Google Play Console**.

---

## 1. Ce que vous devez faire (Prérequis Compte Google)

Google impose que certaines étapes soient effectuées directement par le titulaire du compte développeur :

1. **Créer un compte Google Play Console** :
   - Rendez-vous sur [play.google.com/console](https://play.google.com/console/signup).
   - Payez les frais uniques d'inscription Google (25 $ US).
   - Validez votre identité (pièce d'identité ou vérification d'entreprise D-U-N-S si compte organisation).

2. **Créer une nouvelle application** :
   - Cliquez sur **Créer une application**.
   - Nom de l'application : `MémoCycle`
   - Langue par défaut : `Français (France) – fr-FR`
   - Type : `Application`
   - Gratuit / Payant : `Gratuit`
   - Déclarations : Accepter les conditions et déclarer l'application.

3. **Déposer le fichier `.aab` (Android App Bundle)** :
   - Google Play n'accepte plus les `.apk` bruts pour les nouvelles applications ; il exige un bundle `.aab`.
   - Votre fichier est généré et prêt dans votre OneDrive :  
     📁 `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle.aab`

---

## 2. Fiche Google Play Store (Textes à Copier-Coller)

### 🏷️ Titre de l'application (max 30 caractères)
```text
MémoCycle : Études & Révisions
```

### 📝 Description courte (max 80 caractères)
```text
Révisez intelligemment avec la répétition espacée FSRS et le rappel actif.
```

### 📖 Description complète (max 4000 caractères)
```text
MémoCycle est votre assistant personnel d'apprentissage et de mémorisation à long terme, conçu pour les étudiants, lycéens, candidats aux concours (médecine, droit, prépa, grandes écoles) et autodidactes.

Ne perdez plus votre temps à relire passivement vos cours. Grâce à son algorithme prédictif adaptatif FSRS (Free Spaced Repetition Scheduler) et à la méthode du rappel actif, MémoCycle planifie vos révisions au moment mathématiquement optimal : juste avant que vous n'oubliiez.

🚀 POURQUOI CHOISIR MÉMOCYCLE ?

🧠 Moteur Mémoire Adaptatif FSRS
Chaque notion a sa propre stabilité et difficulté. MémoCycle calcule l'intervalle idéal de répétition en fonction de vos auto-évaluations précises (Oublié, Difficile, Bien, Facile). Mémorisez plus en révisant moins.

🎯 Planification Intelligente par Objectif d'Examen
Renseignez vos dates d'échéances et examens. Le planificateur intelligent rétro-calcule votre charge de travail quotidienne et équilibre automatiquement vos sessions pour éviter le bachotage de dernière minute.

⚡ Rappel Actif & Flashcards Interactives
Transformez vos cours en fiches de révision, textes à trous (cloze) et questions/réponses. Testez votre mémoire activement pour un ancrage synaptique profond et durable.

⏱️ Mode Focus & Chronomètre Pomodoro
Lancez des sessions d'étude guidées de 15, 25, 45 ou 60 minutes. Restez concentré sans distraction avec un retour direct sur votre niveau de rétention.

📊 Statistiques et Courbe de l'Oubli
Visualisez en temps réel votre courbe de rétention, vos matières à consolider, votre historique d'effort et votre régularité d'étude sans stress inutile.

🌐 100% Hors-Ligne & Synchronisation Multi-Appareils
Révisez dans les transports ou sans connexion Internet : tout fonctionne en local sur votre téléphone. Dès que vous retrouvez le réseau, vos données se synchronisent de manière fluide et chiffrée.

🔒 Respect Total de la Vie Privée
Vos données d'apprentissage vous appartiennent. Aucune publicité, aucun pistage tiers, aucun revendeur de données.

---
Téléchargez MémoCycle aujourd'hui et libérez votre potentiel de mémorisation !
```

---

## 3. Réponses aux Questionnaires Obligatoires de la Console

### 🛡️ Sécurité des données (Data Safety)
* **L'application collecte-t-elle des données ?** : Oui (si synchronisation activée).
* **Quelles données sont collectées ?** :
  * *Informations personnelles* : Adresse e-mail (uniquement pour l'authentification/compte).
  * *Activité sur l'application* : Données de cours, fiches de révision et dates d'évaluation (pour la synchronisation du planning d'étude).
* **Les données sont-elles partagées avec des tiers ?** : **Non** (aucun partage avec des tiers, aucun réseau publicitaire).
* **Chiffrement des données en transit** : **Oui** (toutes les connexions utilisent le protocole HTTPS/TLS).
* **Suppression du compte et des données** : **Oui** (l'utilisateur peut supprimer son compte et l'intégralité de ses données directement depuis l'application dans *Paramètres > Compte* ou via la page web dédiée).

### 🔞 Classification du contenu (IARC)
* **Catégorie** : Référence / Éducation / Utilitaires.
* **Violence, sexualité, langage grossier, drogues, jeux d'argent** : **Non** à toutes les questions.
* **Résultat attendu** : PEGI 3 / Tous publics (Everyone).

### 🎯 Public cible et contenu
* **Tranches d'âge cibles** : 13-15 ans, 16-17 ans, 18 ans et plus.
* **L'application est-elle destinée involontairement aux jeunes enfants ?** : Non.
* **Présence de publicités** : Déclarer **"Non, mon application ne contient pas d'annonces"**.

### 📄 URL de la politique de confidentialité (Privacy Policy)
* Google exige une URL publique valide pour la politique de confidentialité.
* Aucun modèle HTML n'est inclus dans cette version ; préparer une page définitive si une publication sur Google Play est envisagée.

---

## 4. Spécifications des Éléments Graphiques du Store

Pour publier la fiche, Google Play vous demandera d'uploader 3 types de visuels :

1. **Icône de l'application** :
   - Format : PNG 32 bits (avec canal alpha)
   - Dimensions : `512 x 512 px`
   - Taille max : 1 Mo
   - *Fichier source disponible dans :* `apps/mobile/assets/icon.png`

2. **Graphique de fonctionnalité (Bannière promotionnelle en haut de fiche)** :
   - Format : JPEG ou PNG 24 bits (sans transparence)
   - Dimensions : `1024 x 500 px`
   - Taille max : 1 Mo

3. **Captures d'écran de l'application (Screenshots)** :
   - Minimum 2 captures (recommandé : 4 à 6).
   - Format : 16:9 ou 9:16 (ex: `1080 x 2400 px` ou `1080 x 1920 px`).
   - Écrans recommandés à capturer :
     1. Écran *Aujourd'hui* (Tableau de bord de révision & Courbe de l'oubli).
     2. Écran *Session de Révision* (Rappel actif, boutons Oublié / Bien / Facile).
     3. Écran *Calendrier & Planification* (Agenda avec échéances d'examens).
     4. Écran *Statistiques* (Métriques de rétention & Heatmap).

---

## 5. Signature et Certificats

* Le bundle `.aab` est signé avec votre keystore de production :
  - Keystore : `credentials/android/memocycle-release.jks`
  - Alias : `memocycle`
  - Package ID : `app.memocycle.mobile`
  - Version Code : `1`
  - Version Name : `1.0.0`
* Vous pouvez activer **Google Play App Signing** dans la console lors de votre premier upload (Google sécurisera votre clé de diffusion).
