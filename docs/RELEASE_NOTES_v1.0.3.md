# MémoCycle Android 1.0.3

Les pages Confidentialité et Conditions d'utilisation et tous leurs liens ont été retirés de l'application. Les modèles HTML correspondants ont aussi été retirés du dépôt. L'aide hors ligne reste disponible et explique maintenant clairement où les données sont enregistrées.

Les données d'étude sont d'abord dans la base SQLite du téléphone, puis synchronisées avec la base PostgreSQL dédiée de MémoCycle sur OVH dès que la connexion le permet. Google ne stocke pas les cours. Les chronos restent sur le téléphone. Aucune sauvegarde indépendante du serveur ni restauration n'est vérifiée actuellement.

APK : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.3.apk`.

Validation : `npm run typecheck`, `npm run lint` et 63/63 tests réussis ; `assembleRelease` réussi. APK vérifié avec `aapt` et `apksigner` : package `app.memocycle.mobile`, versionCode 4, versionName 1.0.3, signature SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25` (inchangée), SHA-256 `4CB5CA5A291A9528B12A176332F8FB26FAAE5EE7D205B5908FDBF80A2B249378`. Empreinte identique dans `artifacts/Memocycle-v1.0.3.apk`, OneDrive et `app-release.apk`.

Aucun appareil ADB connecté lors de ce build : l'installation et l'ouverture sur téléphone restent à vérifier.
