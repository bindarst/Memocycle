# Design et courbe de mémoire

## Direction visuelle

L'interface MémoCycle utilise une palette crème et indigo, un accent vert
citron limité aux progrès et aux moments positifs, des cartes arrondies et une
hiérarchie typographique courte. Le mode sombre conserve les mêmes rôles de
couleur avec des contrastes adaptés.

Les icônes viennent de
[Lucide](https://github.com/lucide-icons/lucide), bibliothèque vectorielle open
source sous licence ISC. Elles sont rendues dans React Native avec
`lucide-react-native` et
[`react-native-svg`](https://github.com/software-mansion/react-native-svg).

## Courbe de l'oubli

La courbe affiche une estimation de la probabilité moyenne de rappel des cours
actifs. Pour chaque cours, la stabilité `S` est l'intervalle entre la dernière
révision et la prochaine échéance. La rétention au temps `t` est :

`R(t, S) = exp(ln(0,9) × t / S)`

La formule garantit `R(S, S) = 90 %`. Ce seuil est cohérent avec la définition
historique de la stabilité utilisée dans les modèles DSR/FSRS ; le projet
[Open Spaced Repetition](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)
documente cette convention. MémoCycle conserve son planning classique actuel :
la courbe le visualise mais ne remplace pas encore le moteur par FSRS.

L'écran Aujourd'hui et le tableau de bord recalculent la valeur toutes les
30 secondes à partir de SQLite. La projection suppose qu'aucune nouvelle
révision n'a lieu pendant l'horizon affiché. Une révision réussie change
l'intervalle, puis la courbe repart de 100 % avec la nouvelle stabilité.

La courbe est volontairement présentée comme une estimation. Les travaux sur
l'apprentissage espacé montrent un bénéfice global des répétitions distribuées,
mais l'intervalle optimal dépend notamment du contenu, de l'apprenant et de la
durée de rétention visée :
[revue scientifique sur l'effet d'espacement](https://pmc.ncbi.nlm.nih.gov/articles/PMC5476736/).
