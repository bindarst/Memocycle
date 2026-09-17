import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

const support = "bindarst2011@gmail.com";
const style = `<style>
  :root{font-family:system-ui,-apple-system,sans-serif;color:#20283a;background:#f7f8fb;line-height:1.65}
  body{margin:0}main{max-width:760px;margin:0 auto;padding:40px 22px 72px}
  .brand{color:#365cf5;font-weight:700;letter-spacing:.02em}h1{font-size:clamp(2rem,6vw,3rem);line-height:1.1;margin:.5em 0}
  h2{font-size:1.25rem;margin-top:2em}p,li{font-size:1rem}a{color:#365cf5}
  .card{background:#fff;border:1px solid #e4e8f0;border-radius:18px;padding:22px 28px}
  .muted{color:#536078}footer{margin-top:32px;font-size:.9rem;color:#536078}
</style>`;

const privacy = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Politique de confidentialité · MémoCycle</title>${style}</head><body><main><p class="brand">MémoCycle</p><h1>Politique de confidentialité</h1><p class="muted">Dernière mise à jour : 17 septembre 2026 · Éditeur : Bindarst</p><div class="card">
<h2>Ce que MémoCycle utilise</h2><p>La connexion Google fournit un identifiant de compte, une adresse e-mail vérifiée et, si disponibles, un nom et une photo de profil. L'application enregistre aussi le fuseau horaire, un identifiant d'installation, la plateforme, la version et éventuellement le nom de l'appareil. Ces informations servent à créer le compte, sécuriser la connexion et gérer les appareils.</p>
<p>Les matières, cours, fiches textuelles, dates d'examen, plannings, révisions et réglages saisis dans l'application sont enregistrés sur le téléphone puis synchronisés avec une base PostgreSQL dédiée à MémoCycle hébergée sur OVH. Cette synchronisation permet de retrouver les données sur un autre appareil et de poursuivre les révisions hors ligne. Les fichiers PDF joints restent dans le stockage privé du téléphone : ils ne sont pas transmis au serveur MémoCycle et ne se synchronisent pas.</p>
<h2>Partage et sécurité</h2><p>Google est utilisé pour l'identification ; OVH héberge l'API et la base de données MémoCycle. Les données ne sont ni vendues ni utilisées pour la publicité. L'application n'intègre pas de suivi publicitaire ni d'outil d'analyse d'audience. Les échanges avec l'API utilisent HTTPS. Les jetons de session sont protégés dans le stockage sécurisé du téléphone, et les jetons de renouvellement sont enregistrés sous forme d'empreinte sur le serveur.</p>
<h2>Conservation et suppression</h2><p>Les données du compte sont conservées pendant que le compte est actif. Dans l'application, Profil → Compte et données permet de supprimer le compte ; cette action supprime les données associées de la base active et les données locales de l'appareil utilisé. Après désinstallation, vous pouvez aussi <a href="/v1/public/delete-account">demander la suppression depuis le Web</a>. Les PDF locaux sont supprimés lors de la suppression du compte sur l'appareil, lors de la déconnexion avec effacement local, ou à la désinstallation. Les journaux techniques de l'API ne contiennent pas le contenu des cours.</p>
<h2>Questions</h2><p>Pour toute question ou demande relative aux données, écrivez à <a href="mailto:${support}">${support}</a>.</p>
</div><footer>Application MémoCycle · Bindarst</footer></main></body></html>`;

const deletion = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Supprimer mon compte · MémoCycle</title>${style}</head><body><main><p class="brand">MémoCycle</p><h1>Supprimer mon compte</h1><div class="card"><p>Dans MémoCycle, ouvrez <strong>Profil → Compte et données → Supprimer mon compte</strong>. La suppression efface le compte et les données d'étude associées de la base active, ainsi que les données locales sur cet appareil. Elle est définitive.</p><p>Si vous n'avez plus accès à l'application, envoyez votre demande à <a href="mailto:${support}?subject=Suppression%20de%20mon%20compte%20M%C3%A9moCycle">${support}</a> depuis l'adresse liée à votre compte. Nous pourrons demander une vérification d'identité avant d'effectuer la suppression. N'envoyez jamais votre mot de passe ni un code de connexion par e-mail.</p><p>Les PDF ne sont pas conservés sur le serveur. Pour effacer ceux d'un autre téléphone, désinstallez MémoCycle de cet appareil.</p><p><a href="/v1/public/privacy">Politique de confidentialité</a></p></div></main></body></html>`;

@Controller("public")
export class PublicController {
  @Get("privacy")
  privacyPage(@Res() response: Response) {
    response.type("html").send(privacy);
  }

  @Get("delete-account")
  deleteAccountPage(@Res() response: Response) {
    response.type("html").send(deletion);
  }
}
