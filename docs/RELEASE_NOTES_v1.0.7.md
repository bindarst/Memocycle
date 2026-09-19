# MémoCycle 1.0.7 (Android code 8)

## Changements

- Refonte de l'ajout et de la modification d'une matière avec aperçu immédiat.
- Douze catégories de matières : général, maths, sciences, langues, informatique,
  sciences humaines, arts, musique, droit, santé, économie et ingénierie.
- Dix couleurs d'accent sobres inspirées du système Carbon.
- La couleur et l'icône choisies apparaissent désormais réellement dans la
  bibliothèque et dans l'en-tête de la matière.
- Sélecteurs plus grands, plus lisibles et accessibles.

## Livrables

- `artifacts/Memocycle-v1.0.7.apk` pour l'installation directe Android.
- `artifacts/Memocycle-v1.0.7.aab` pour Google Play Console.

Les données restent d'abord enregistrées dans SQLite sur le téléphone. Les
données textuelles sont synchronisées avec la base PostgreSQL dédiée MémoCycle
sur OVH ; les PDF restent uniquement dans le stockage privé du téléphone.
