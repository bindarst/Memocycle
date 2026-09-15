import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {OAuth2Client,LoginTicket,type TokenPayload} from 'google-auth-library';
import {GoogleAuthService,InvalidGoogleTokenError} from '../apps/api/src/auth/google/google-auth.service';
const valid:TokenPayload={iss:'https://accounts.google.com',aud:'web-client',sub:'stable-subject',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,email:'student@example.com',email_verified:true};
beforeEach(()=>{process.env.GOOGLE_WEB_CLIENT_ID='web-client';});
afterEach(()=>vi.restoreAllMocks());
describe('Google ID token verification boundary',()=>{
  it('uses the verified subject and configures the audience in google-auth-library',async()=>{const spy=vi.spyOn(OAuth2Client.prototype,'verifyIdToken').mockResolvedValue(new LoginTicket('',valid));expect((await new GoogleAuthService().verifyGoogleIdToken('test')).providerSubject).toBe(valid.sub);expect(spy).toHaveBeenCalledWith({idToken:'test',audience:expect.arrayContaining(['web-client'])});});
  it.each([{...valid,aud:'attacker-client'},{...valid,iss:'https://attacker.example'},{...valid,exp:0},{...valid,email_verified:false},{...valid,sub:''}])('rejects invalid claims',async p=>{vi.spyOn(OAuth2Client.prototype,'verifyIdToken').mockResolvedValue(new LoginTicket('',p));await expect(new GoogleAuthService().verifyGoogleIdToken('bad')).rejects.toBeInstanceOf(InvalidGoogleTokenError);});
  it('rejects signature verification errors without returning provider details',async()=>{vi.spyOn(OAuth2Client.prototype,'verifyIdToken').mockRejectedValue(new Error('invalid signature'));await expect(new GoogleAuthService().verifyGoogleIdToken('bad')).rejects.toThrow('Identité Google non valide');});
});
