# MémoCycle Android 1.0.5 — préparation Google Play

Cette version reprend le calendrier d'examens et les PDF locaux de la 1.0.4. Elle ajoute le lien vers la politique de confidentialité depuis l'accueil et le profil, bloque la permission Android `SYSTEM_ALERT_WINDOW` inutile, et augmente `versionCode` à 6 pour permettre la mise à jour des APK 1.0.4 installés directement.

Livrables : `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.5.apk` et `C:\Users\Adminpc\OneDrive\Memocycle\Memocycle-v1.0.5.aab` ; copies identiques dans `artifacts/`. Le bundle `.aab` est destiné à Google Play, l'APK à l'installation directe.

Validation : compilation API, TypeScript et ESLint sans erreur, 66/66 tests réussis, `bundleRelease` et `assembleRelease` réussis. Package `app.memocycle.mobile`, cible Android API 36, signature APK v2, certificat SHA-1 `2E:58:2C:B8:35:27:1E:CA:47:91:05:7F:AE:AA:D2:71:11:0C:DC:25` inchangé. SHA-256 APK : `10C62C655653AF28FD5E97C3DE89ADBBD3D96B0A4470A77AD4D463284EC727F4` ; AAB : `012315B97F87E18309669928C2E1DB659FE2E2BABD9DF4F5D1A47DAECC17F176`.

L'API a été testée localement avec une base PostgreSQL temporaire indépendante de la GMAO : santé, politique de confidentialité et demande de suppression répondent en HTTP 200 ; la route calendrier sans session répond 401. Les deux pages doivent encore être déployées et vérifiées sur l'URL publique avant la soumission Play. Aucun téléphone ADB ni émulateur déjà configuré n'était disponible au moment du build ; les parcours d'importation et lecture PDF restent à tester sur appareil.
