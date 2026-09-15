import {it,expect,vi,beforeEach} from 'vitest';
import {randomUUID} from 'node:crypto';
const storage=vi.hoisted(()=>new Map<string,string>());
vi.mock('expo-secure-store',()=>({WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device-only',setItemAsync:async(k:string,v:string)=>{storage.set(k,v);},getItemAsync:async(k:string)=>storage.get(k)??null,deleteItemAsync:async(k:string)=>{storage.delete(k);}}));
import {saveSession,loadSession,clearSession} from '../apps/mobile/src/auth/tokenStorage';
import {offlineAllowed} from '../apps/mobile/src/auth/offlinePolicy';
beforeEach(()=>storage.clear());
it('enforces the 30 day offline window and rejects a backwards clock',()=>{const now=Date.now();expect(offlineAllowed({lastVerifiedAt:new Date(now-29*86400000).toISOString()},now)).toBe(true);expect(offlineAllowed({lastVerifiedAt:new Date(now-30*86400000).toISOString()},now)).toBe(false);expect(offlineAllowed({lastVerifiedAt:new Date(now+1000).toISOString()},now)).toBe(false);expect(offlineAllowed({lastVerifiedAt:'invalid'},now)).toBe(false);});
it('round-trips and clears a single secure session envelope',async()=>{const id=randomUUID();const session={accessToken:'access',refreshToken:'refresh',accessTokenExpiresAt:new Date().toISOString(),lastVerifiedAt:new Date().toISOString(),currentUserId:id,user:{id,email:'test@example.com',displayName:null,avatarUrl:null,onboardingCompleted:false,subscriptionTier:'free' as const}};await saveSession(session);expect(await loadSession()).toEqual(session);await clearSession();expect(await loadSession()).toBeNull();});
