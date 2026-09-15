/* global google, MEMOCYCLE_PUBLIC_CONFIG */
const confirmation=document.querySelector('#confirmation');
const container=document.querySelector('#google-button');
const status=document.querySelector('#status');
const support=document.querySelector('#support');
const config=typeof MEMOCYCLE_PUBLIC_CONFIG==='undefined'?null:MEMOCYCLE_PUBLIC_CONFIG;
if(config?.supportEmail)support.href=`mailto:${config.supportEmail}?subject=Suppression%20compte%20M%C3%A9moCycle`;
let initialized=false;
async function onCredential(response){
  if(confirmation.value!=='SUPPRIMER')return;
  container.hidden=true;confirmation.disabled=true;status.textContent='Suppression en cours…';
  try{
    const result=await fetch(`${config.apiUrl}/v1/account/delete-with-google`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:response.credential,confirmation:'SUPPRIMER'})});
    if(!result.ok)throw new Error('delete failed');
    status.textContent='Ton compte Google MémoCycle et ses données actives ont été supprimés. Les autres appareils devront se reconnecter.';
  }catch{status.textContent='La suppression n’a pas pu être confirmée. Réessaie ou contacte l’assistance.';confirmation.disabled=false;container.hidden=false;}
}
function initialize(){
  if(initialized||!config?.googleWebClientId||typeof google==='undefined')return;
  google.accounts.id.initialize({client_id:config.googleWebClientId,callback:onCredential,auto_select:false});
  google.accounts.id.renderButton(container,{type:'standard',theme:'outline',size:'large',text:'continue_with',locale:'fr'});initialized=true;
}
confirmation.addEventListener('input',()=>{initialize();container.hidden=confirmation.value!=='SUPPRIMER'||!initialized;if(!config)status.textContent='Ce service doit être configuré par l’éditeur avant sa publication.';});
window.addEventListener('load',initialize);
