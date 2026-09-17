# MémoCycle Android 1.0.4

La date de chaque examen se choisit dans un calendrier tactile, avec des heures rapides. Les examens existants peuvent désormais être modifiés depuis la matière ou le module.

Des PDF peuvent être ajoutés aux matières, cours et fiches. Les fichiers et leurs métadonnées restent dans le stockage privé du téléphone ; ils ne sont pas envoyés à OVH. La sauvegarde automatique Android de l'application est désactivée. Les PDF sont supprimés lors de la déconnexion ou de la désinstallation. Les cours, fiches textuelles, dates d'examen et révisions continuent à être synchronisés avec la base MémoCycle sur OVH.

APK : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.4.apk`.

Validation : `npm run typecheck`, `npm run lint` et 66/66 tests réussis ; `assembleRelease` réussi. APK vérifié avec `aapt` et `apksigner` : package `app.memocycle.mobile`, versionCode 5, versionName 1.0.4, signature SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25` inchangée, SHA-256 `4A31F184A19678720CE7BB66D0481717437F0292CF04AD575A8453BC18418885`. Le manifeste Android embarqué indique `allowBackup=false`. Empreinte identique dans `artifacts/Memocycle-v1.0.4.apk`, OneDrive et `app-release.apk`.

Aucun appareil ADB connecté lors du build : l'importation et l'ouverture de PDF restent à vérifier sur téléphone.

Préparation iOS : projet [@bindarst/memocycle](https://expo.dev/accounts/bindarst/projects/memocycle) lié et bundle Hermes iOS compilé. Aucun build iPhone installable : EAS s'arrête avant la compilation distante faute de certificat et de profil Apple. L'éditeur ne dispose pas d'un abonnement Apple Developer. Expo Go iPhone standard ne prend pas en charge le SDK 57 ni le module Google natif de l'application. Google iOS, Apple Sign-In et la politique de sauvegarde iCloud des PDF restent à valider.
