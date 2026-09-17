# Publication Google Play — MémoCycle

État au 17 septembre 2026 : le compte personnel Play Console **Bindarst** est actif. Il contient la GMAO « Iso Care Maint » (`com.equaz.mobile`), qui doit rester intacte. MémoCycle doit être créé comme **nouvelle application** avec le package `app.memocycle.mobile`. Aucun déploiement Play MémoCycle n'est encore confirmé.

## Fichiers prêts

- App Bundle Google Play signé : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.5.aab` (83 873 406 octets ; SHA-256 `012315B97F87E18309669928C2E1DB659FE2E2BABD9DF4F5D1A47DAECC17F176`).
- APK autonome : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.5.apk` (SHA-256 `10C62C655653AF28FD5E97C3DE89ADBBD3D96B0A4470A77AD4D463284EC727F4`). L'APK ne remplace pas l'AAB demandé par Play.
- Package `app.memocycle.mobile`, version `1.0.5`, code `6`, cible API Android `36`. Certificat de signature historique SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25`, SHA-256 `88:76:D4:8F:54:D4:02:53:AE:D7:05:DC:79:5F:EF:B6:5C:80:08:45:D3:AF:85:5B:EC:75:30:41:DF:2F:AD:84`.
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
- Permissions relevées dans l'APK 1.0.5 : Internet/réseau, notifications, vibration, démarrage, biométrie et permissions de badges ; lecture/écriture de stockage externe limitées à Android 12 ou antérieur (`maxSdkVersion=32`). Pas de permission `SYSTEM_ALERT_WINDOW` ni de permission calendrier dans le manifeste final. Cette liste ne remplace pas l'audit des données réellement collectées par les SDK.

## Points de publication à terminer

1. Créer la fiche MémoCycle, puis choisir pour **Play App Signing** la **clé de signature d'application existante**. Si Google génère une autre clé, les installations directes de l'APK MémoCycle ne pourront pas être mises à jour par Play sans désinstallation ; leurs PDF locaux seraient alors perdus. Garder la clé privée hors Git.
2. Faire au moins deux **vraies captures d'écran** de l'application sur Android. Aucun téléphone ADB ou émulateur configuré n'était disponible lors de la préparation du bundle ; ne pas présenter de maquette comme capture d'écran réelle.
3. Compléter les questionnaires de contenu, la sécurité des données, l'accès des examinateurs (connexion Google requise), le classement par âge, la publicité, les coordonnées et les pays de diffusion. Les déclarations doivent correspondre au comportement effectivement vérifié de l'application.
4. Vérifier la connexion Google sur un second compte Android. Le projet OAuth `memocycle` est en mode **Test** et seul `bindarst2011@gmail.com` figure dans la liste des testeurs. Toutefois, [Google précise que l'exception « Se connecter avec Google » s'applique lorsque seules les données d'identité de base sont demandées](https://support.google.com/cloud/answer/15549945?hl=fr) : les autres utilisateurs n'ont alors pas besoin d'être ajoutés comme testeurs et leurs autorisations n'expirent pas après sept jours. Le code MémoCycle demande un jeton d'identité, et aucun niveau d'accès sensible ou restreint n'est configuré dans la console. Ne pas présenter cela comme validé en conditions réelles avant un essai sur un compte non testeur. Le branding OAuth complet reste souhaitable, mais il ne faut pas acheter un domaine uniquement en supposant que le mode Test empêche cette connexion de base.
5. Si Play Console impose à ce compte personnel les règles des nouveaux comptes, organiser un test fermé avec au moins 12 testeurs inscrits pendant 14 jours avant l'accès à la production. La console affiche le statut réel du compte.

La publication n'est terminée que lorsque Play Console affiche une version approuvée et disponible dans le canal voulu. Un AAB construit localement ne suffit pas.
