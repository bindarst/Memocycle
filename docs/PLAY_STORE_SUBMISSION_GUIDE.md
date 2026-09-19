# Publication Google Play — MémoCycle

État au 19 septembre 2026 : MémoCycle existe dans le compte Play Console **Bindarst** sous l'ID `4972354992207967892`, séparément de la GMAO « Iso Care Maint » (`com.equaz.mobile`). La version 1.0.6 (code 7) est disponible sur le canal de test interne actif pour `bindarst2011@gmail.com` : https://play.google.com/apps/internaltest/4701281405599427540. La version 1.0.7 (code 8) est construite et prête à être importée. L'application n'est pas encore disponible publiquement en production.

## Fichiers prêts

- App Bundle Google Play signé : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.7.aab` (83 834 787 octets ; SHA-256 `116707FADBACFCDCF22A7744D1BE9EE7D0D93140B9275E8822425969EF99FF0B`).
- APK autonome : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.7.apk` (128 132 380 octets ; SHA-256 `99DD1C804341ACC4583F9FC493E6FA8D9F6A118953B9C6529DB9AC1ADD471959`). L'APK ne remplace pas l'AAB demandé par Play.
- Package `app.memocycle.mobile`, version `1.0.7`, code `8`, cible API Android `36`. Certificat de signature historique SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25`, SHA-256 `88:76:D4:8F:54:D4:02:53:AE:D7:05:DC:79:5F:EF:B6:5C:80:08:45:D3:AF:85:5B:EC:75:30:41:DF:2F:AD:84`.
- Icône et bannière : `store-assets/icon-512.png` (512 × 512) et `store-assets/feature-graphic.png` (1024 × 500).

## Fiche en français

- Nom : **MémoCycle**.
- Langue par défaut : **français (France)**.
- Type : **application**, **sans frais**, catégorie **Éducation**.
- Public visé confirmé : **13 ans et plus**. Diffusion initiale souhaitée : **pays francophones** ; sélectionner les pays réellement disponibles dans Play Console.
- Description courte : `Révisions espacées, fiches et examens : apprends au bon moment.`

Description complète proposée :

> MémoCycle t'aide à organiser tes cours et à réviser au bon moment. Crée des matières, des cours et des fiches, puis évalue ce que tu retiens après chaque révision. Le planning s'adapte à tes réponses grâce à la répétition espacée FSRS.
>
> Choisis les dates de tes examens dans un calendrier simple et visualise tes prochaines échéances. L'agenda t'aide à répartir le travail ; un mode Focus et un chronomètre gardent le temps de chaque séance, même si tu fermes l'application.
>
> Ajoute des PDF à tes matières, cours et fiches. Ces PDF restent sur ton téléphone et ne sont pas envoyés au serveur. Les données textuelles de tes études sont conservées localement et se synchronisent avec ton compte MémoCycle lorsque tu retrouves une connexion Internet.
>
> Consulte tes statistiques et la courbe de rétention pour repérer les notions à consolider. MémoCycle fonctionne aussi hors ligne après la première connexion. Aucune publicité ni achat intégré.

## Informations à déclarer

- Politique de confidentialité déployée et vérifiée HTTPS 200 : `https://memocycle.135-125-100-75.sslip.io/v1/public/privacy`.
- Demande de suppression du compte déployée et vérifiée HTTPS 200 : `https://memocycle.135-125-100-75.sslip.io/v1/public/delete-account`.
- Page de présentation OAuth déployée et vérifiée HTTPS 200 : `https://memocycle.135-125-100-75.sslip.io/v1/public`.
- E-mail public de contact confirmé : `bindarst2011@gmail.com`.
- Données traitées : adresse e-mail vérifiée, nom/photo de profil si disponibles, identifiant de compte, données d'études textuelles, dates d'examen, révisions, réglages, fuseau horaire et informations techniques de l'appareil. Les PDF ne sont ni téléversés ni synchronisés.
- Les données du compte transitent par HTTPS et sont stockées sur la base dédiée MémoCycle chez OVH ; Google sert à l'identification. Aucun SDK publicitaire ou d'analyse d'audience n'est intégré. Une suppression de compte est disponible dans l'application et par demande Web.
- Déclarer ces traitements dans le questionnaire **Sécurité des données** de Play Console. Ne pas répondre « aucune donnée collectée » : la synchronisation OVH est active. Vérifier chaque catégorie et les pratiques des SDK avant validation finale.
- Permissions précédemment relevées dans l'APK : Internet/réseau, notifications, vibration, démarrage, biométrie et permissions de badges ; lecture/écriture de stockage externe limitées à Android 12 ou antérieur (`maxSdkVersion=32`). Pas de permission `SYSTEM_ALERT_WINDOW` ni de permission calendrier dans le manifeste final. Cette liste ne remplace pas l'audit des données réellement collectées par les SDK.

## Points de publication à terminer

1. Faire au moins deux **vraies captures d'écran** de l'application sur Android. Ne pas présenter de maquette comme capture d'écran réelle.
2. Compléter les questionnaires de contenu, la sécurité des données, l'accès des examinateurs, le classement par âge, la publicité, les coordonnées, la fiche principale et les pays de diffusion.
3. Vérifier la connexion Google sur un second compte Android. Le projet OAuth `memocycle` est en mode **Test** et seul `bindarst2011@gmail.com` figure dans la liste des testeurs OAuth.
4. Organiser le test fermé imposé par Play Console : au moins 12 testeurs inscrits sans interruption pendant 14 jours, puis demander l'accès à la production.

Google Play App Signing utilise désormais une clé d'application SHA-256 `94:D9:5D:5C:F8:6A:FB:8E:74:17:F5:1F:7A:66:5B:79:87:56:98:B5:6F:DE:C8:59:8D:70:5A:F2:9F:B5:F5:7B`. La clé d'import reste la clé historique indiquée plus haut. Comme les clés d'application diffèrent, une installation APK directe existante ne pourra vraisemblablement pas être mise à jour directement par la version Play : sauvegarder les PDF locaux avant toute désinstallation.

La publication n'est terminée que lorsque Play Console affiche une version approuvée et disponible dans le canal voulu. Un AAB construit localement ne suffit pas.
