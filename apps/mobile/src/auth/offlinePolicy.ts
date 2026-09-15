export function offlineAllowed(value:{lastVerifiedAt:string},now=Date.now()){
  const age=now-new Date(value.lastVerifiedAt).getTime();
  return Number.isFinite(age)&&age>=0&&age<30*86400_000;
}
