# MémoCycle Android 1.0.6 — Google Play et nouvelle icône

Cette version remplace l'icône Android par une identité visuelle sobre inspirée des principes de grille Carbon : fond graphite, bleu cobalt, formes géométriques et symbole de cycle. Les icônes classique, ronde, adaptative et la ressource 512 × 512 du Play Store sont générées depuis les sources SVG par `node scripts/render-mobile-icons.mjs`.

Android passe à `versionName 1.0.6` et `versionCode 7`. Les livrables signés sont `artifacts/Memocycle-v1.0.6.apk` et `artifacts/Memocycle-v1.0.6.aab`.

- SHA-256 APK : `99DD1C804341ACC4583F9FC493E6FA8D9F6A118953B9C6529DB9AC1ADD471959`
- SHA-256 AAB : `116707FADBACFCDCF22A7744D1BE9EE7D0D93140B9275E8822425969EF99FF0B`
- Validation : TypeScript sans erreur, 66 tests réussis, `bundleRelease` et `assembleRelease` réussis.

La connexion Google de la version distribuée par Play nécessitait un client OAuth Android associé à la clé de signature générée par Google Play. Package : `app.memocycle.mobile`. SHA-1 Play : `05:16:EF:26:8E:8D:4A:00:BD:86:B9:4F:9B:50:08:36:D7:C3:D9:3C`.
