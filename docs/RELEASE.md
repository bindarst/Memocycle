# Validation avant publication

## Validation locale obtenue le 15 septembre 2026

- TypeScript, ESLint et compilation des espaces de travail : réussis.
- Tests métier et SQLite : 22/22 réussis.
- Tests d’intégration SQLite/PostgreSQL : 11/11 réussis après application des deux migrations de production.
- Expo Doctor : 21/21 contrôles réussis.
- Bundles Hermes Android et iOS : exportés avec succès.
- Build Android natif autonome signé pour la production : réussi. La version
  1.0.0 a été installée et démarrée sur un Samsung `SM-S938B` ; la connexion
  Google et la synchronisation restent à valider par une interaction utilisateur.
- Image Docker API et configuration Compose de production : validées.
- Audit npm : aucune vulnérabilité connue signalée.

Ces contrôles valident le code, l'artefact Android et le déploiement OVH. Ils ne
remplacent pas les essais complets sur plusieurs appareils, les identifiants
OAuth réels ni la validation des stores.

## Configurations externes nécessaires

- Les identifiants Google Android et Web et la signature Android de production
  sont configurés. L'identifiant iOS, Apple Sign-In et la publication OAuth
  générale restent à finaliser.
- Bundle ID, entitlement Sign in with Apple, identifiants Apple Developer et signatures iOS.
- L'API OVH et sa base PostgreSQL indépendante sont déployées. Le certificat TLS
  est actif sur `memocycle.135-125-100-75.sslip.io`. Un domaine définitif pourra
  remplacer cette adresse sans déplacer les données.
- Si une publication sur le Play Store est prévue, préparer les informations et documents demandés par la plateforme avec les coordonnées définitives de l’éditeur. Aucun modèle de page juridique n’est fourni dans cette version.
- Configurer la page de suppression avec `node --env-file=.env infra/configure-public.mjs` ; seules des valeurs publiques sont produites. Le formulaire Google utilise une nouvelle preuve d’identité et ne crée pas de compte. Pour Apple, la procédure dans l’application et le contact support sont indiqués.

## Parcours devant encore être vérifiés sur appareils

1. Premier lancement, absence de flash d’une route privée, connexion Google et Apple, annulation et refus de permission.
2. Fermer réellement l’application hors connexion puis la rouvrir ; conserver cours, planning, historique et outbox.
3. Rappels après redémarrage du téléphone, restrictions de batterie Android, appareil verrouillé, et clic à froid après expiration de session.
4. Deux appareils physiques : modifications croisées, double validation hors connexion, changements de fuseau et passage heure d’été/hiver.
5. Logout, changement d’utilisateur, suppression depuis l’application et depuis le Web. Vérifier la disparition des notifications système, y compris déjà livrées.
6. VoiceOver/TalkBack, grandes tailles de texte, tablette, contraste et captures des stores.

Les tests automatisés remplacent les SDK d’identité et de notification par leurs frontières de test ; ils ne prouvent pas le bon fonctionnement d’un compte OAuth ou d’un système de notifications réel. SQLite et PostgreSQL sont en revanche réellement exécutés dans les tests métier et de synchronisation.

## Éléments restant à finaliser

- Résumé quotidien du matin : champ réservé, désactivé, pas de commande utilisateur exposée.
- Réordonnancement et archivage des matières/modules : le modèle les prévoit ; l’interface couvre création, modification, navigation et suppression à vide, mais aucun écran de tri manuel n’est exposé.
- Quitter le compte sans réseau en abandonnant explicitement ses modifications : la version actuelle privilégie la conservation et demande la synchronisation avant logout.
- Les notifications futures au-delà des 60 prochaines échéances attendent une réconciliation ; pas de push de réveil pour les changements réalisés sur un autre appareil.
- Purge planifiée des sessions expirées, des résultats d’idempotence et du journal de synchronisation, avec protocole de rattrapage préalable. Aucun mécanisme de purge risquant une perte de données n’est activé.
- Durcissement d’exploitation : alertes, tests de restauration chiffrée sur une base isolée, test de charge, politique de rétention et traitement des suppressions dans les sauvegardes. Le script de sauvegarde est fourni mais aucune sauvegarde OVH n’a été exécutée.
- Paiements et abonnements : aucune intégration de paiement ; aucun faux achat. Les types et la configuration sont préparés.

Ces points et les validations externes empêchent de qualifier cette livraison de version commerciale entièrement prête à publier.

## Exploitation OVH

Utiliser un fichier d’environnement hors Git, accessible uniquement à l’opérateur. Démarrer PostgreSQL, appliquer les migrations avec l’image de build avant de démarrer la nouvelle API, puis contrôler `/v1/health`. PostgreSQL est accessible uniquement sur le réseau Docker interne en production.

Les migrations `202609140001_initial` et `202609140002_constraints` sont versionnées. Les prochaines évolutions doivent ajouter une migration, sans modifier celles déjà appliquées. Ne pas utiliser `prisma migrate reset` en production.

`infra/backup.sh` produit un dump PostgreSQL chiffré avec `age` et un checksum. Fournir `BACKUP_DIRECTORY`, `AGE_RECIPIENT` et `COMPOSE_ENV_FILE` ; conserver la clé privée de restauration séparément. Copier les sauvegardes sur un stockage indépendant. La fréquence et la rétention doivent être décidées par l’opérateur avant mise en service. Valider une restauration vers une base isolée avant de promettre des objectifs de reprise.

Les unités `infra/memocycle-backup.service` et `infra/memocycle-backup.timer` lancent ce script chaque jour avec rattrapage après une extinction du VPS. Installer les deux unités dans `/etc/systemd/system`, adapter les chemins et le compte de service, puis activer le timer avec `systemctl enable --now memocycle-backup.timer`. Le répertoire de sauvegarde doit être répliqué ou monté sur un stockage hors du VPS et conserver au moins sept jours.
