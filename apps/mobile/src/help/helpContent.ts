export type HelpDestination =
  | "today"
  | "library"
  | "calendar"
  | "stats"
  | "studySettings"
  | "notifications"
  | "calendarSettings"
  | "devices"
  | "account";

export type HelpTopic = {
  id: string;
  question: string;
  answer: string;
  steps?: string[];
  keywords?: string;
  destination?: HelpDestination;
  actionLabel?: string;
};

export type HelpSection = {
  id: string;
  title: string;
  subtitle: string;
  topics: HelpTopic[];
};

export const helpSections: HelpSection[] = [
  {
    id: "start",
    title: "Bien démarrer",
    subtitle: "Les premiers gestes dans MémoCycle",
    topics: [
      {
        id: "start-what",
        question: "À quoi sert MémoCycle ?",
        answer: "MémoCycle t’aide à organiser tes cours et à les retrouver en mémoire au bon moment. Tu ajoutes une matière et un cours, tu étudies, puis tu évalues ce dont tu te souviens. L’application propose ensuite les prochaines révisions. Le calendrier, la courbe et les statistiques rendent ton travail visible sans remplacer ton jugement.",
        destination: "today",
        actionLabel: "Voir Aujourd’hui",
      },
      {
        id: "start-first",
        question: "Par quoi commencer ?",
        answer: "Commence avec un seul cours pour découvrir le fonctionnement. La matière est obligatoire ; le module permet de classer davantage si tu en as besoin.",
        steps: [
          "Dans Cours, crée une matière, puis touche Nouveau cours.",
          "Renseigne le titre, choisis la matière et enregistre.",
          "Ouvre le cours, étudie-le puis touche « J’ai étudié ce cours » pour démarrer son planning.",
          "Reviens dans Aujourd’hui pour voir les prochaines révisions.",
        ],
        destination: "library",
        actionLabel: "Ouvrir Cours",
      },
      {
        id: "start-navigation",
        question: "Où trouver les fonctions principales ?",
        answer: "Aujourd’hui montre les priorités du jour et la courbe de l’oubli. Cours regroupe les matières, modules, cours et fiches. Calendrier présente les révisions, examens et séances prévues. Profil donne accès aux statistiques, préférences, appareils, compte et à cette aide.",
      },
      {
        id: "start-account",
        question: "Faut-il un compte Google ?",
        answer: "Sur Android, le bouton de connexion utilise ton compte Google pour confirmer ton identité ; sur iPhone, la connexion Apple est également proposée. Cette connexion n’ouvre pas tes e-mails ou ton Drive. La connexion à Google Agenda est une fonction distincte et facultative dans les réglages des calendriers. Une première connexion demande Internet ; un compte déjà ouvert peut ensuite travailler hors ligne.",
        keywords: "authentification oauth apple prix api",
      },
    ],
  },
  {
    id: "organize",
    title: "Matières, cours et fiches",
    subtitle: "Construire une bibliothèque utile",
    topics: [
      {
        id: "organize-structure",
        question: "Quelle différence entre matière, module et cours ?",
        answer: "Une matière rassemble un domaine, par exemple Électrotechnique. Un module est un classement facultatif à l’intérieur de cette matière. Un cours est le contenu précis que tu étudies et révises. Les fiches sont des questions ou notes rattachées à un cours.",
        destination: "library",
        actionLabel: "Organiser mes cours",
      },
      {
        id: "organize-course",
        question: "Comment créer ou modifier un cours ?",
        answer: "Dans Cours, crée d’abord une matière. Utilise Nouveau cours, choisis sa matière, puis enregistre. Pour changer le titre, le descriptif ou l’organisation, ouvre sa fiche et utilise l’action de modification. Un cours sans planning peut être étudié avant de lancer son cycle de révision.",
        destination: "library",
        actionLabel: "Voir les cours",
      },
      {
        id: "organize-cards",
        question: "À quoi servent les fiches de révision ?",
        answer: "Les fiches permettent de tester le rappel actif plutôt que de relire passivement. Utilise une flashcard pour un recto et un verso, une question pour une réponse ciblée, un texte à trous pour retrouver un élément manquant ou une note pour garder une idée essentielle. Un indice peut aider sans montrer immédiatement la réponse.",
      },
      {
        id: "organize-pdf",
        question: "Comment ajouter un PDF à une matière, un cours ou une fiche ?",
        answer: "Ouvre la matière ou le cours et touche Ajouter un PDF dans la section Documents PDF. Pour une fiche, crée-la d’abord puis utilise Ajouter un PDF sous cette fiche. Tu peux ouvrir ou retirer les documents depuis le même écran. Chaque PDF est copié dans le stockage privé de MémoCycle sur ce téléphone, avec une limite de 50 Mo. Il n’est pas envoyé à OVH et ne suit pas la synchronisation des cours.",
        destination: "library",
        actionLabel: "Ouvrir mes cours",
      },
      {
        id: "organize-no-cards",
        question: "Puis-je réviser sans créer de fiches ?",
        answer: "Oui. L’écran Réviser propose une auto-évaluation globale quand le cours n’a pas de fiche. Essaie d’abord de restituer le contenu de mémoire, puis choisis Oublié, Difficile, Bien ou Facile. Tu peux ajouter des fiches plus tard pour rendre cette évaluation plus précise.",
      },
      {
        id: "organize-archive",
        question: "Que devient un cours archivé ?",
        answer: "Un cours archivé quitte les listes de révision active, mais reste accessible dans le filtre Archivés de Cours. Tu peux le rouvrir si tu en as de nouveau besoin. L’archivage évite de confondre un ancien cours avec les priorités du jour.",
        destination: "library",
        actionLabel: "Voir les archives",
      },
    ],
  },
  {
    id: "review",
    title: "Révisions intelligentes",
    subtitle: "Comprendre le rappel et les échéances",
    topics: [
      {
        id: "review-start",
        question: "Comment démarrer le planning d’un cours ?",
        answer: "Après avoir réellement étudié un cours, ouvre-le et touche « J’ai étudié ce cours ». Cette action enregistre le premier apprentissage et crée ses prochaines échéances. Le bouton Réviser apparaît ensuite pour un planning actif. Une session d’étude depuis Aujourd’hui ou Calendrier peut également valider un premier apprentissage.",
        destination: "library",
        actionLabel: "Ouvrir un cours",
      },
      {
        id: "review-steps",
        question: "Comment se déroule une révision ?",
        answer: "Ouvre une révision due ou le bouton Réviser d’un cours. Lis la question, cherche la réponse sans regarder, puis affiche-la. Évalue chaque fiche selon ta facilité à la retrouver. Termine la session et valide pour enregistrer le résultat et recalculer la prochaine échéance. Sans fiche, donne une note globale au cours.",
        destination: "today",
        actionLabel: "Voir les révisions du jour",
      },
      {
        id: "review-ratings",
        question: "Que signifient Oublié, Difficile, Bien et Facile ?",
        answer: "Oublié : tu ne retrouves pas la réponse. Difficile : tu y arrives avec beaucoup d’effort ou une hésitation importante. Bien : tu retrouves correctement la réponse. Facile : elle vient immédiatement. Une note honnête aide le planning à s’adapter ; il n’y a pas de pénalité à choisir Oublié.",
        keywords: "notes notation évaluation again hard good easy",
      },
      {
        id: "review-fsrs",
        question: "Comment sont calculées les prochaines dates ?",
        answer: "Les nouveaux plannings utilisent FSRS, un modèle de répétition espacée qui ajuste les intervalles selon tes réponses et l’objectif de rétention. Les anciens plannings peuvent garder un cycle classique à six étapes. Les dates sont des recommandations : révise plus tôt si un examen approche ou si un sujet te semble fragile.",
        keywords: "algorithme intervalle mémoire six étapes",
      },
      {
        id: "review-retention",
        question: "À quoi sert l’objectif de rétention ?",
        answer: "Il règle le niveau de rappel visé par la planification adaptative, 90 % par défaut. Un objectif plus élevé rapproche généralement les révisions et demande davantage de temps ; un objectif plus bas les espace. Modifie-le dans Profil > Temps quotidien selon ta charge réelle.",
        destination: "studySettings",
        actionLabel: "Régler la rétention",
      },
      {
        id: "review-method",
        question: "Pourquoi une méthode d’étude est-elle recommandée ?",
        answer: "MémoCycle suggère une méthode selon le type de contenu, tes connaissances initiales et l’étape du cours : rappel libre, questions ciblées, exercices, lecture active, explication ou exemple guidé. La suggestion sert de guide ; touche son nom dans l’écran Réviser pour choisir une autre méthode.",
      },
      {
        id: "review-early",
        question: "Puis-je réviser avant la date prévue ?",
        answer: "Oui. Le bouton Réviser d’un cours actif permet une révision volontaire. Si l’échéance est encore loin, l’application te demande de confirmer avant de valider. Cela change le planning : fais-le lorsque tu as réellement testé ta mémoire, pas seulement relu le cours.",
      },
    ],
  },
  {
    id: "focus",
    title: "Sessions et chrono",
    subtitle: "Travailler à ton rythme sans perdre le temps",
    topics: [
      {
        id: "focus-open",
        question: "Comment lancer une session d’étude ?",
        answer: "Depuis Aujourd’hui, Calendrier ou la fiche d’un cours, ouvre Démarrer ou Commencer la session. L’écran rassemble le chrono, les fiches et la validation finale. Tu peux avancer entre les fiches, afficher une réponse et noter ce que tu as retrouvé.",
        destination: "today",
        actionLabel: "Ouvrir Aujourd’hui",
      },
      {
        id: "focus-modes",
        question: "Quelle différence entre Focus et chrono libre ?",
        answer: "Focus compte à rebours depuis 15, 25, 45 ou 60 minutes ; 25 minutes est la valeur initiale. Le chrono libre compte le temps écoulé sans limite. Change de mode ou de durée avant de démarrer : cette action remet le compteur du mode choisi à zéro.",
      },
      {
        id: "focus-leave",
        question: "Le chrono continue-t-il si je quitte l’application ?",
        answer: "Oui, tant qu’il est en cours : son heure de départ est conservée sur ce téléphone pour ton compte et ce cours. En revenant, le temps est recalculé, même après une veille ou un redémarrage. Si tu l’as mis en pause, il reste en pause. Un Focus arrivé à zéro s’arrête ; touche Recommencer pour un nouveau cycle.",
        keywords: "timer pomodoro ferme arrière-plan réinitialisé",
      },
      {
        id: "focus-finish",
        question: "Quand utiliser « Valider la session » ?",
        answer: "Valide quand ton travail est terminé et que tu as évalué honnêtement tes fiches. Cette action enregistre l’apprentissage ou la révision et remet à zéro le chrono de ce cours. Si tu veux seulement faire une pause et reprendre plus tard, quitte l’écran sans valider : le chrono enregistré restera disponible.",
      },
    ],
  },
  {
    id: "planning",
    title: "Calendrier et examens",
    subtitle: "Prévoir le travail sans te surcharger",
    topics: [
      {
        id: "planning-views",
        question: "À quoi servent les vues Agenda, Semaine et Mois ?",
        answer: "Agenda détaille les événements à venir. Semaine aide à répartir les journées. Mois donne une vue d’ensemble. Tu y retrouves les révisions prévues, les examens et les sessions d’étude planifiées. Touche un jour ou un élément pour examiner sa place dans le planning.",
        destination: "calendar",
        actionLabel: "Ouvrir Calendrier",
      },
      {
        id: "planning-exams",
        question: "Comment préparer un examen ?",
        answer: "Ajoute l’examen depuis la matière ou le module concerné. Touche la date pour ouvrir le calendrier, choisis un jour et une heure rapide, puis enregistre. Dans les 30 jours précédant l’épreuve, Aujourd’hui affiche automatiquement un plan examen : il répartit ton temps disponible entre les cours les plus fragiles et indique un niveau de préparation estimé. Touche une mission pour commencer.",
        destination: "calendar",
        actionLabel: "Voir le calendrier",
      },
      {
        id: "planning-rescue",
        question: "Comment fonctionne le plan « Sauve mon examen » ?",
        answer: "Le plan apparaît dans Aujourd’hui lorsqu’un examen est prévu dans moins de 30 jours. Il rassemble les cours de la matière, place en premier ceux qui n’ont pas encore été étudiés ou dont la rétention estimée est faible, puis respecte ton objectif de temps quotidien. Le pourcentage « Prêt » est une estimation fondée sur tes révisions : ce n’est pas une garantie de résultat.",
        destination: "today",
        actionLabel: "Voir mon plan du jour",
        keywords: "sauve examen urgence préparation prêt missions",
      },
      {
        id: "planning-balance",
        question: "Que fait la répartition automatique ?",
        answer: "Quand plusieurs révisions se concentrent sur une même journée, Calendrier peut proposer de déplacer certaines échéances vers des jours moins chargés. Examine les propositions avant de les confirmer : les révisions en retard ou trop proches d’un examen ne doivent pas être repoussées sans raison.",
      },
      {
        id: "planning-session",
        question: "Comment planifier une séance de travail ?",
        answer: "Depuis Calendrier, crée une séance liée à un cours, à un créneau de début et de fin. Elle apparaît dans le planning et dans Aujourd’hui lorsqu’elle est prévue ce jour-là. Ouvre-la pour démarrer la session et son chrono.",
      },
      {
        id: "planning-time",
        question: "À quoi sert l’objectif de temps quotidien ?",
        answer: "Il sert de repère pour comparer la charge prévue à ton temps disponible ; il ne bloque pas les sessions. Dans Profil > Temps quotidien, choisis 15, 30, 45, 60 minutes ou aucune limite. Adapte-le à ton emploi du temps plutôt que de viser une durée irréaliste.",
        destination: "studySettings",
        actionLabel: "Régler mon temps",
      },
    ],
  },
  {
    id: "progress",
    title: "Courbe et statistiques",
    subtitle: "Lire les indicateurs avec recul",
    topics: [
      {
        id: "progress-curve",
        question: "Que montre la courbe de l’oubli ?",
        answer: "La courbe représente une estimation de la probabilité moyenne de te rappeler tes cours actifs. Elle évolue avec le temps et les révisions enregistrées. Utilise les boutons 7 j, 14 j et 30 j pour simuler l’évolution ; Examen projette la courbe jusqu’à l’épreuve la plus proche. Sans planning actif, l’application montre une courbe théorique. Ce n’est ni une mesure directe de ton cerveau, ni une note d’examen.",
        destination: "today",
        actionLabel: "Voir la courbe",
      },
      {
        id: "progress-radar",
        question: "Comment lire le radar de maîtrise ?",
        answer: "Le radar compare jusqu’à six matières dans Progression. Chaque axe correspond à une matière et sa distance au centre représente la rétention moyenne estimée. Une zone courte signale une matière à consolider. Le radar devient disponible dès que trois matières contiennent des cours suivis.",
        destination: "stats",
        actionLabel: "Voir mon radar",
        keywords: "radar maîtrise matière fragile",
      },
      {
        id: "progress-weekly",
        question: "Que contient le bilan hebdomadaire ?",
        answer: "Le bilan des sept derniers jours affiche le nombre d’activités, le temps consacré, le taux de réponses Bien ou Facile et la différence avec la semaine précédente. Son message met en avant le prochain effort utile. Tu le trouveras en haut de Progression.",
        destination: "stats",
        actionLabel: "Voir mon bilan",
        keywords: "semaine rapport bilan progrès temps réussite",
      },
      {
        id: "progress-risk",
        question: "Pourquoi un cours apparaît-il « À consolider » ?",
        answer: "L’application estime que ce cours mérite une nouvelle tentative de rappel, par exemple parce que sa révision approche, qu’il est en retard ou que sa rétention prévue baisse. Ouvre le cours et teste-toi ; la priorité est une aide à la décision, pas un jugement sur tes capacités.",
      },
      {
        id: "progress-stats",
        question: "Comment interpréter les statistiques ?",
        answer: "Les graphiques présentent ton activité, les révisions terminées, la régularité et des estimations de rétention selon la période choisie. Compare surtout ton évolution personnelle. Un jour sans étude ou une réponse Oublié ne rend pas les efforts précédents inutiles.",
        destination: "stats",
        actionLabel: "Voir mes statistiques",
      },
      {
        id: "progress-heatmap",
        question: "Que signifie la carte d’activité ?",
        answer: "Chaque case représente une journée de travail enregistrée ; une couleur plus marquée indique davantage d’activité. Elle montre une habitude, pas la qualité de chaque séance. Les séances non validées ne sont pas forcément comptées comme révisions achevées.",
      },
    ],
  },
  {
    id: "sync",
    title: "Hors ligne et synchronisation",
    subtitle: "Retrouver tes données sur tes appareils",
    topics: [
      {
        id: "sync-offline",
        question: "Puis-je étudier sans connexion Internet ?",
        answer: "Oui, après une première connexion au compte. Les cours et modifications sont gardés sur ce téléphone ; les opérations en attente seront envoyées lorsque le réseau reviendra. Le chrono fonctionne localement. La connexion initiale et certaines actions de compte exigent toutefois Internet.",
      },
      {
        id: "sync-status",
        question: "Que signifie « modifications en attente » ?",
        answer: "Le téléphone conserve des changements qui n’ont pas encore rejoint le serveur. Dans Profil, touche Synchroniser après avoir retrouvé un réseau stable. Attends la disparition de l’alerte avant de désinstaller l’application, de changer de téléphone ou de te déconnecter.",
      },
      {
        id: "sync-multiple",
        question: "Comment retrouver mes cours sur un autre téléphone ?",
        answer: "Sur l’ancien appareil, connecte-toi à Internet et termine la synchronisation. Installe MémoCycle sur le nouvel appareil puis connecte-toi avec la même identité. Laisse la première synchronisation se terminer. Les PDF ajoutés dans MémoCycle et un chrono en cours restent sur l’ancien téléphone : ils ne sont pas transférés entre appareils.",
      },
      {
        id: "sync-conflict",
        question: "Que faire si un conflit de synchronisation apparaît ?",
        answer: "Un conflit signifie que deux versions d’un même élément demandent une vérification, par exemple après des modifications sur plusieurs appareils hors ligne. Garde les applications installées et connectées ; relance Synchroniser avec un réseau stable. Ne supprime pas les données locales pour tenter de faire disparaître l’alerte.",
      },
      {
        id: "sync-logout",
        question: "Pourquoi la déconnexion demande-t-elle Internet ?",
        answer: "MémoCycle vérifie d’abord que les modifications locales ont été envoyées, puis retire les données du compte de cet appareil. Si des changements restent en attente, reconnecte-toi au réseau et synchronise avant de réessayer. Cela évite de perdre du travail non transmis.",
      },
    ],
  },
  {
    id: "reminders",
    title: "Rappels et calendriers",
    subtitle: "Choisir ce qui t’aide vraiment",
    topics: [
      {
        id: "reminders-enable",
        question: "Comment activer les notifications ?",
        answer: "Dans Profil > Notifications, active les rappels de révision et accepte la permission demandée par Android ou iOS. Tu peux aussi régler les rappels pour les retards et les examens. Si rien n’apparaît, vérifie les autorisations de MémoCycle dans les paramètres du téléphone.",
        destination: "notifications",
        actionLabel: "Régler les rappels",
      },
      {
        id: "reminders-quiet",
        question: "À quoi servent les heures calmes ?",
        answer: "Elles permettent d’éviter les rappels sonores pendant une plage horaire, par exemple la nuit. Définis l’heure de début et de fin dans Notifications ou désactive la plage lorsque tu n’en as plus besoin.",
        destination: "notifications",
        actionLabel: "Voir les heures calmes",
      },
      {
        id: "reminders-calendar",
        question: "MémoCycle peut-il utiliser mon agenda ?",
        answer: "Dans Profil > Calendriers, les connexions à Google Agenda, Outlook ou au calendrier du téléphone sont séparées de la connexion à MémoCycle. Tu peux choisir le mode de synchronisation proposé, ou exporter un fichier .ics. Vérifie les permissions et le calendrier sélectionné avant d’importer ou de synchroniser des événements.",
        destination: "calendarSettings",
        actionLabel: "Gérer les calendriers",
      },
      {
        id: "reminders-no-push",
        question: "Pourquoi un rappel peut-il manquer ?",
        answer: "Vérifie d’abord le bouton Rappels, la permission système, les heures calmes et la date de la révision. Certains réglages d’économie de batterie ou de notifications du téléphone peuvent différer ou masquer une alerte. Ouvre MémoCycle pour actualiser le planning si tu viens de modifier plusieurs cours hors ligne.",
      },
      {
        id: "reminders-widget",
        question: "Comment ajouter le widget MémoCycle sur Android ?",
        answer: "Fais un appui long sur une zone vide de l’écran d’accueil Android, choisis Widgets, cherche MémoCycle puis fais glisser le widget. Il affiche un raccourci vers la priorité du jour et ouvre directement l’application avec le bouton Réviser. Les informations se rafraîchissent lorsque tu ouvres MémoCycle.",
        keywords: "widget écran accueil android raccourci",
      },
    ],
  },
  {
    id: "account",
    title: "Compte, données et sécurité",
    subtitle: "Garder la maîtrise de ton travail",
    topics: [
      {
        id: "account-data",
        question: "Où sont sauvegardées mes données ?",
        answer: "Tes matières, cours, fiches, dates d’examen, révisions et réglages sont enregistrés dans SQLite sur ce téléphone et synchronisés avec la base PostgreSQL dédiée à MémoCycle sur OVH. Les PDF joints aux matières, cours et fiches restent uniquement dans l’application sur ce téléphone : ils ne sont jamais envoyés à l’API. Le chrono reste local lui aussi. Les PDF disparaissent si tu te déconnectes ou désinstalles l’application. Google sert à te connecter, pas à stocker tes cours.",
        destination: "account",
        actionLabel: "Compte et données",
      },
      {
        id: "account-google",
        question: "La connexion Google donne-t-elle accès à mes fichiers ?",
        answer: "Non : la connexion Google à MémoCycle sert à confirmer ton identité. Elle ne lit pas Gmail ni Google Drive. Si tu connectes séparément Google Agenda, cette fonction demande les autorisations liées au calendrier ; tu peux la déconnecter dans Profil > Calendriers.",
        destination: "calendarSettings",
        actionLabel: "Gérer Google Agenda",
      },
      {
        id: "account-devices",
        question: "Comment gérer mes appareils connectés ?",
        answer: "Dans Profil > Appareils connectés, consulte les sessions de ton compte et retire celles que tu ne reconnais pas ou n’utilises plus. Un appareil retiré devra se reconnecter pour synchroniser. Vérifie d’abord que ses changements en attente ont été envoyés.",
        destination: "devices",
        actionLabel: "Voir mes appareils",
      },
      {
        id: "account-delete",
        question: "Comment supprimer mon compte ?",
        answer: "Ouvre Profil > Compte et données > Supprimer mon compte, puis écris SUPPRIMER pour confirmer. Cette opération efface les données de compte du service et les données locales de l’appareil connecté. Elle est définitive : vérifie ton choix avant de confirmer.",
        destination: "account",
        actionLabel: "Compte et données",
      },
    ],
  },
  {
    id: "trouble",
    title: "Résoudre un problème",
    subtitle: "Les vérifications les plus utiles",
    topics: [
      {
        id: "trouble-login",
        question: "La connexion Google ne fonctionne pas : que faire ?",
        answer: "Vérifie Internet, la date et l’heure du téléphone, puis ferme et rouvre MémoCycle. Assure-toi de choisir le même compte Google que d’habitude. Si le bouton signale que l’accès est limité, ton compte peut ne pas être autorisé par la configuration de connexion actuelle ; garde le message exact pour le signaler au responsable de l’application.",
        keywords: "authentification impossible oauth",
      },
      {
        id: "trouble-course",
        question: "Je ne retrouve plus un cours",
        answer: "Dans Cours, efface la recherche et vérifie les filtres Tout, Actifs, Terminés et Archivés. Confirme aussi que tu es connecté au bon compte. Sur un nouvel appareil, attends la fin de la synchronisation avant de conclure que le cours manque.",
        destination: "library",
        actionLabel: "Chercher un cours",
      },
      {
        id: "trouble-review",
        question: "Le bouton Réviser ne s’ouvre pas ou la session échoue",
        answer: "Installe la dernière mise à jour de MémoCycle, rouvre le cours et vérifie que son planning est actif. Si une validation échoue, ne répète pas les notes à l’aveugle : relance l’application, reconnecte-toi au réseau et note le message affiché. Ton travail déjà synchronisé ne dépend pas du seul affichage de la page.",
      },
      {
        id: "trouble-timer",
        question: "Mon chrono semble réinitialisé",
        answer: "Rouvre exactement le même cours avec le même compte : chaque chrono est propre à ce couple sur ce téléphone. Changer de mode ou de durée, toucher Réinitialiser ou valider la session remet le compteur à zéro. Le chrono n’est pas synchronisé vers un second appareil. Vérifie aussi que l’application est à jour.",
      },
      {
        id: "trouble-install",
        question: "Comment installer une mise à jour Android ?",
        answer: "Ouvre l’APK MémoCycle reçu dans OneDrive ou depuis la source de téléchargement de confiance. Android peut demander d’autoriser l’installation depuis cette application de fichiers. Installe la mise à jour par-dessus la version précédente avec la même signature. Ne désinstalle pas l’ancienne application : les PDF locaux seraient perdus, même si les cours et dates ont été synchronisés. Expo et un câble USB ne sont pas nécessaires.",
      },
      {
        id: "trouble-report",
        question: "Quelles informations garder pour signaler un bug ?",
        answer: "Note ce que tu as touché, le texte exact de l’erreur, la date, le modèle du téléphone, la version de MémoCycle affichée en bas de Profil et si tu étais hors ligne. Une capture d’écran aide, mais évite d’y laisser des données sensibles. Ne partage jamais ton mot de passe ni un code de connexion.",
      },
    ],
  },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

export function filterHelpSections(query: string, category = "all"): HelpSection[] {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return helpSections
    .filter((section) => category === "all" || section.id === category)
    .map((section) => ({
      ...section,
      topics: section.topics.filter((topic) => {
        const corpus = normalize([
          section.title,
          section.subtitle,
          topic.question,
          topic.answer,
          ...(topic.steps ?? []),
          topic.keywords ?? "",
        ].join(" "));
        return words.every((word) => corpus.includes(word));
      }),
    }))
    .filter((section) => section.topics.length > 0);
}
