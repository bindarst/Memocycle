# Mettre MémoCycle à jour sur Google Play

Ce guide décrit la mise à jour d'une application MémoCycle déjà créée dans Play
Console. Google Play utilise le fichier `.aab`. Le fichier `.apk` sert uniquement
à une installation directe sur un téléphone.

## 1. Préparer une nouvelle version

Chaque envoi doit utiliser un `versionCode` Android plus grand que le précédent.
Dans `apps/mobile/app.config.ts`, modifier par exemple :

```ts
version: "1.0.8",
// ...
versionCode: 9,
```

Pour un build Android local existant, reporter les mêmes valeurs dans
`apps/mobile/android/app/build.gradle` (`versionName` et `versionCode`). Ne jamais
remplacer ni perdre la clé de signature : Google Play refuserait la mise à jour.

## 2. Vérifier et construire

Depuis PowerShell, à la racine du dépôt :

```powershell
npm ci
npm run typecheck
npm test
cd apps/mobile/android
$env:JAVA_HOME='C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
.\gradlew.bat assembleRelease bundleRelease --no-daemon
```

Les fichiers produits sont :

- `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

## 3. Envoyer l'AAB dans Play Console

1. Ouvrir [Google Play Console](https://play.google.com/console/).
2. Choisir **MémoCycle**.
3. Ouvrir **Tester et publier**, puis le canal voulu, par exemple **Tests internes**.
4. Cliquer sur **Créer une version**.
5. Importer le nouveau fichier `app-release.aab`.
6. Ajouter les notes de version en français.
7. Cliquer sur **Suivant**, corriger les erreurs éventuelles, puis **Enregistrer et publier**.
8. Attendre le traitement Google Play et tester la mise à jour depuis le lien du canal.

Pour la production, utiliser **Production** uniquement lorsque Play Console rend
ce canal disponible. Le compte affiche actuellement une exigence de test fermé
avec 12 testeurs pendant 14 jours avant de pouvoir demander cet accès.

## 4. Contrôles utiles

- Le package doit rester `app.memocycle.mobile`.
- Le `versionCode` doit toujours augmenter.
- Conserver une copie privée de la clé de signature et de ses mots de passe.
- Tester la connexion Google, la création d'une matière, une révision et l'ouverture
  d'un PDF avant d'élargir la diffusion.
- Une installation provenant de Google Play doit ensuite être mise à jour depuis
  Google Play afin de conserver la même chaîne de signature.
