export type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] };

export type LegalDocument = {
  title: string;
  lead: string;
  sections: LegalSection[];
};

export const privacyDocument: LegalDocument = {
  title: "Confidentialité",
  lead: "Voici comment MémoCycle utilise les données nécessaires à ton compte et à tes révisions. Ce texte reste accessible sans connexion.",
  sections: [
    {
      title: "1. Responsable et contact",
      paragraphs: [
        "MémoCycle est le service concerné par cette notice. L’identité juridique, l’adresse et le contact de l’éditeur doivent encore être renseignés avant une publication publique. Cette version intégrée décrit le fonctionnement connu de l’application et ne remplace pas ces informations obligatoires.",
      ],
    },
    {
      title: "2. Données utilisées",
      paragraphs: ["Les données dépendent des fonctions que tu utilises :"],
      bullets: [
        "Compte : identifiant fourni par Google ou Apple, adresse e-mail, nom affiché et éventuellement photo de profil.",
        "Études : matières, modules, cours, fiches, examens, séances, réponses de révision, dates de planning et réglages.",
        "Appareils : sessions de connexion et informations nécessaires à la synchronisation et aux rappels.",
        "Calendriers externes : autorisations et événements liés uniquement si tu connectes séparément un calendrier dans les réglages.",
        "Chrono en cours : état stocké sur cet appareil, par compte et par cours ; il n’est pas transmis comme chrono actif à un autre téléphone.",
      ],
    },
    {
      title: "3. Pourquoi ces données ?",
      paragraphs: [
        "MémoCycle les utilise pour ouvrir ton compte, organiser tes cours, calculer les dates de révision, afficher ta progression, envoyer les rappels demandés et synchroniser tes changements entre appareils. Les connexions à Google Agenda, Outlook et au calendrier du téléphone sont facultatives et distinctes de la connexion au compte.",
        "La base juridique précise de chaque traitement doit être confirmée par l’éditeur avant publication. Aucune publicité ciblée n’est intégrée au parcours actuel de l’application.",
      ],
    },
    {
      title: "4. Où vont les données ?",
      paragraphs: [
        "Les données d’étude sont d’abord enregistrées dans la base locale du téléphone. Lorsqu’une connexion est disponible, elles sont synchronisées avec l’API et la base PostgreSQL dédiées à MémoCycle sur une infrastructure OVH séparée de tout autre projet. Les prestataires d’identité Google ou Apple interviennent lors de la connexion ; un fournisseur de calendrier intervient seulement si tu actives sa connexion.",
        "La liste définitive des sous-traitants, lieux de traitement et transferts éventuels doit être vérifiée et publiée par l’éditeur.",
      ],
    },
    {
      title: "5. Sécurité et conservation",
      paragraphs: [
        "L’application utilise une connexion réseau chiffrée et conserve les informations de session dans le stockage sécurisé du téléphone. Les changements hors ligne restent localement en attente de synchronisation. Évite de désinstaller l’application ou de changer d’appareil tant que Profil indique des modifications en attente.",
        "Les données de compte sont nécessaires tant que le compte est utilisé. Les durées exactes de conservation des journaux, sessions et sauvegardes doivent encore être fixées et communiquées. La suppression du compte déclenche la suppression des données de service et des données locales du téléphone connecté ; le traitement des éventuelles sauvegardes doit être précisé avant publication.",
      ],
    },
    {
      title: "6. Tes choix et tes droits",
      paragraphs: [
        "Tu peux modifier tes cours et réglages dans l’application, retirer une connexion de calendrier, gérer les appareils, te déconnecter ou demander la suppression définitive du compte dans Profil > Compte et données. La suppression exige une confirmation explicite.",
        "Selon les règles applicables, tu peux également demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de tes données, et exercer un droit d’opposition lorsque celui-ci s’applique. Le contact pour exercer ces droits et l’autorité de contrôle compétente doivent être indiqués par l’éditeur avant publication.",
      ],
    },
    {
      title: "7. Évolution de cette notice",
      paragraphs: [
        "Cette notice doit être complétée avec l’identité de l’éditeur, ses coordonnées, les bases juridiques, les durées, les destinataires et les modalités d’exercice des droits avant publication publique. Une mise à jour importante de l’utilisation des données devra être expliquée dans une nouvelle version.",
      ],
    },
  ],
};

export const termsDocument: LegalDocument = {
  title: "Conditions d’utilisation",
  lead: "Ces conditions décrivent l’usage actuel de MémoCycle et les responsabilités de chacun. Elles sont lisibles dans l’application sans connexion.",
  sections: [
    {
      title: "1. Éditeur et portée",
      paragraphs: [
        "MémoCycle est une application d’organisation des études et de répétition espacée. L’identité juridique, l’adresse et le contact de l’éditeur doivent encore être ajoutés avant publication publique. Le présent texte décrit la version actuelle ; les informations contractuelles de l’éditeur restent à finaliser.",
      ],
    },
    {
      title: "2. Accès au service",
      paragraphs: [
        "La connexion sur Android utilise Google ; sur iOS, Apple peut aussi être proposé. Tu es responsable de l’accès à ton compte sur tes appareils. Une première connexion et la synchronisation exigent Internet, tandis que les cours déjà ouverts restent utilisables hors ligne selon l’état de la session.",
        "Les connexions facultatives à un calendrier externe sont séparées de l’authentification MémoCycle et soumises aussi aux règles du fournisseur concerné.",
      ],
    },
    {
      title: "3. Fonctions et limites",
      paragraphs: [
        "Tu peux créer des matières, cours et fiches, planifier des examens et des sessions, évaluer tes rappels et suivre des propositions de révision. Les dates FSRS, priorités, statistiques et courbes sont des estimations destinées à guider ton travail. Elles ne garantissent ni mémorisation parfaite ni résultat à un examen.",
        "Vérifie les dates importantes et adapte les propositions à tes contraintes. Les rappels peuvent être affectés par les permissions et réglages du téléphone.",
      ],
    },
    {
      title: "4. Contenus et usage responsable",
      paragraphs: [
        "Tu restes responsable des textes et fiches que tu saisis et dois disposer du droit de les utiliser. N’ajoute pas de contenu illicite ou portant atteinte aux droits d’autrui. MémoCycle traite ces contenus pour faire fonctionner le service et les synchroniser avec ton compte, sans te demander de renoncer à leur propriété.",
      ],
    },
    {
      title: "5. Données hors ligne et appareils",
      paragraphs: [
        "Les modifications hors ligne restent sur le téléphone jusqu’à la synchronisation. Avant de désinstaller MémoCycle, de changer d’appareil ou de te déconnecter, assure-toi que Profil n’indique plus de modifications en attente. Le chrono en cours est local et ne suit pas ton compte sur un autre téléphone.",
        "La fonction de déconnexion attend la synchronisation pour limiter la perte de modifications non transmises. Il est prudent de conserver une copie des contenus d’étude importants.",
      ],
    },
    {
      title: "6. Disponibilité et évolution",
      paragraphs: [
        "Une connexion, le téléphone, les fournisseurs d’identité, les calendriers tiers et le serveur peuvent connaître des interruptions. Les fonctions peuvent évoluer avec les mises à jour. Une erreur, une échéance manquée ou une interruption doit être examinée avec les informations de l’application et, si besoin, signalée à l’éditeur lorsqu’un contact sera publié.",
        "Aucune disposition de ce texte ne retire les droits impératifs dont tu bénéficies selon la loi applicable.",
      ],
    },
    {
      title: "7. Prix et services tiers",
      paragraphs: [
        "Cette version de MémoCycle ne propose pas de paiement ni d’abonnement dans l’application. Une connexion à Google pour l’identité ne nécessite pas l’achat d’une clé API par l’utilisateur. L’accès Internet et les services tiers éventuels restent soumis à leurs propres conditions et tarifs. Toute offre payante future devra être annoncée clairement avant un achat.",
      ],
    },
    {
      title: "8. Déconnexion et suppression",
      paragraphs: [
        "Tu peux te déconnecter depuis Profil après synchronisation. Dans Profil > Compte et données, tu peux demander la suppression définitive du compte en écrivant SUPPRIMER. Cette opération efface le compte et ses contenus du service ; vérifie ton choix avant de confirmer.",
      ],
    },
    {
      title: "9. Texte à finaliser",
      paragraphs: [
        "Avant publication publique, l’éditeur doit compléter ses coordonnées, les modalités de contact, les règles de modification des conditions, le droit applicable et les informations requises pour le public concerné. Ces points ne sont pas inventés dans cette version intégrée.",
      ],
    },
  ],
};
