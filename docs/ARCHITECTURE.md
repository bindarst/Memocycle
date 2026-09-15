# MémoCycle : décisions techniques

## Sources de vérité

SQLite est la base de travail de l’application. Les vues et les actions de création, modification, archivage et révision ne dépendent pas d’un aller-retour réseau. PostgreSQL conserve l’état canonique partagé entre appareils. Aucun jeu de données de démonstration n’est chargé.

Le monorepo utilise npm workspaces. Les contrats Zod et le moteur classique résident dans `packages/contracts`. Les adaptateurs mobile et API réexportent le même calcul, sans deuxième scheduler. Les mutations métier serveur sont centralisées dans `SyncService`, pour conserver les contrôles d’autorisation, l’idempotence et les transactions au même endroit.

## Révisions

Les intervalles sont des durées réelles en heures : 24, 72, 168, 336, 720 et 1440. L’index du calcul est zéro-based ; `currentStep` présenté à l’utilisateur va de 1 à 6. Après la dernière validation, l’échéance est nulle. Les intervalles sont copiés dans chaque planning.

Une validation locale enregistre événement, planning, état du cours et outbox dans une transaction SQLite exclusive. Les UUID v4 sont générés sur l’appareil. L’identifiant de l’événement est également l’identifiant de la commande locale : un second clic reste idempotent après acquittement de l’outbox.

`ReviewPlan.version` protège les commandes de planning. `Course.version` protège les métadonnées éditables du cours. Une validation modifie le statut du cours, mais n’incrémente pas sa version de métadonnées : une modification de titre faite sur un autre appareil reste applicable dans les deux ordres de synchronisation. Le journal de changements possède sa propre séquence.

Pour recommencer un cycle sans réécrire son historique, `scheduleVersion` identifie le cycle, et les événements contiennent `cycle`. La contrainte est donc `(reviewPlanId, cycle, stepIndex)`, plutôt qu’une contrainte empêchant à jamais de refaire l’étape 1. Les études initiales et redémarrages ont un index nul. Un trigger PostgreSQL interdit toute mise à jour d’un événement ; la suppression du compte peut les supprimer.

## Synchronisation et conflits

Le serveur verrouille la ligne utilisateur pour sérialiser ses mutations. L’incrément transactionnel de `syncSequence` garantit que l’ordre du cursor correspond à l’ordre des commits, contrairement à une séquence PostgreSQL globale allouée avant commit. Le journal est paginé par 500 changements, isolé par utilisateur.

Le serveur conserve le résultat et l’empreinte de chaque mutation. Réutiliser un identifiant avec un autre contenu est rejeté. Les conflits apparaissent dans `mutationResults` avec `status: conflict`, dans la réponse de batch HTTP 200, et non comme un statut HTTP 409 qui rendrait les acquittements partiels ambigus.

Le client envoie une mutation à la fois, dans l’ordre SQLite. L’outbox n’est supprimée qu’après une réponse terminale du serveur. En cas de conflit, la commande et son contenu sont déplacés dans `sync_conflicts`. Les validations optimistes refusées sont retirées de l’historique local ; l’état canonique est appliqué. Les modifications encore en attente sont protégées pendant l’application des changements.

`server_shadow` garde les états canoniques temporairement masqués par une écriture locale. Seules les lignes à appliquer sont retraitées. Les versions anciennes ne remplacent pas les nouvelles. Application, acquittement et cursor partagent une seule transaction. Les suppressions synchronisées enlèvent les lignes locales et leurs dépendances ; les tombstones serveur empêchent leur résurrection.

Le journal et les résultats d’idempotence n’ont pas encore de purge automatique. Une future rétention devra obliger les clients trop anciens à reprendre un snapshot complet avant de compacter les tombstones. Aucun nettoyage destructeur implicite n’est activé.

## Authentification

Google est vérifié avec `google-auth-library` ; Apple avec les JWKS Apple et la vérification du nonce. Les identités se basent sur le couple fournisseur/sujet. Deux fournisseurs ne sont jamais liés automatiquement par email.

Les access tokens durent 15 minutes. Les refresh tokens sont opaques, produits avec 32 octets aléatoires ; seul SHA-256 est conservé au serveur. Une table de hashes utilisés permet la détection de rejeu et la révocation de la session concernée. Le verrou de session empêche deux rotations simultanées de réussir.

Toutes les routes privées vérifient aussi l’état de la session, de l’appareil et de l’utilisateur dans PostgreSQL. Le mobile conserve son enveloppe de session uniquement dans SecureStore, avec la restriction à l’appareil. La fenêtre hors connexion est strictement inférieure à 30 jours, sans accepter une horloge revenue avant la dernière vérification.

Les tables locales sont isolées par `owner_user_id`, y compris les clés étrangères. La suppression locale d’un compte ne supprime pas les données d’un autre compte. Les notifications portent aussi leur propriétaire et sont annulées à la déconnexion.

## Notifications

Une seule échéance future par cours est programmée. La réconciliation intervient au démarrage, lors des changements SQLite et après synchronisation. Le clic est conservé pendant l’authentification et n’est ouvert que pour le bon compte et un cours existant.

Le nombre de rappels programmés est limité aux 60 prochaines échéances afin de conserver une marge sur iOS. L’application reste utilisable si la permission est refusée. Le résumé du matin reste désactivé et n’est pas proposé tant que sa livraison quotidienne n’a pas été validée. Les changements venant d’un autre appareil ne mettent pas à jour les rappels d’une application fermée avant son prochain lancement : aucun service de push n’est implémenté.

## Exploitation

Le reverse proxy Caddy termine TLS ; PostgreSQL n’expose aucun port en production. Le réseau de base est interne. La limite HTTP au proxy est de 1 Mo. Les endpoints d’authentification ont une limitation dédiée. Aucun token ni contenu de cours n’est journalisé par le code applicatif.

Les paramètres commerciaux existent, mais aucune facturation, restriction artificielle ou simulation de Pro n’est activée. La synchronisation multi-appareils est disponible pour les comptes gratuits de cette V1.
