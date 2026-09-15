import 'reflect-metadata';
import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SQLiteDatabase} from 'expo-sqlite';
import {PrismaService} from '../apps/api/src/database/prisma.service';
import {SyncService} from '../apps/api/src/sync/sync.service';
import {syncRequestSchema,courseInput,subjectInput} from '../packages/contracts/src';
import {SqliteAdapter} from './databaseAdapter';
const bridge=vi.hoisted(()=>({db:null as unknown,userId:'',send:null as unknown}));
vi.mock('../apps/mobile/src/database/database',()=>({database:async()=>bridge.db}));
vi.mock('expo-crypto',()=>({randomUUID}));
vi.mock('../apps/mobile/src/auth/authService',()=>({currentSession:()=>({currentUserId:bridge.userId}),api:async(_path:string,body:unknown)=>(bridge.send as (b:unknown)=>Promise<unknown>)(body)}));
import {migrate} from '../apps/mobile/src/database/migrations';
import {save,all,find} from '../apps/mobile/src/database/repository';
import {completeReview} from '../apps/mobile/src/review/reviewService';
import {sync} from '../apps/mobile/src/sync/syncService';
import {pendingCount} from '../apps/mobile/src/sync/outboxService';
const url=process.env.TEST_DATABASE_URL;
if(!url?.includes('memocycle_test'))throw new Error('Use isolated test database');
const server=new PrismaService({datasourceUrl:url});const service=new SyncService(server);
let a:SqliteAdapter,b:SqliteAdapter;
beforeAll(()=>server.$connect());afterAll(()=>server.$disconnect());
beforeEach(async()=>{
  await server.user.deleteMany();const user=await server.user.create({data:{email:'integration@example.com',timezone:'Europe/Brussels',settings:{create:{}}}});bridge.userId=user.id;
  const device=await server.device.create({data:{userId:user.id,installationId:randomUUID(),platform:'android',appVersion:'test'}});
  bridge.send=(body:unknown)=>service.sync(user.id,device.id,syncRequestSchema.parse(body));
  a=new SqliteAdapter();b=new SqliteAdapter();await migrate(a as unknown as SQLiteDatabase);await migrate(b as unknown as SQLiteDatabase);bridge.db=a;
});
afterEach(()=>{a.close();b.close();});
async function seed(){const subjectId=await save('subject',bridge.userId,subjectInput.parse({title:'Matière'}));const courseId=await save('course',bridge.userId,courseInput.parse({title:'Cours',subjectId}));await completeReview(bridge.userId,courseId,'start',randomUUID());await sync();return {subjectId,courseId};}
it('synchronizes actual SQLite outboxes and PostgreSQL without losing metadata in either order',async()=>{
  const {subjectId,courseId}=await seed();expect(await pendingCount(bridge.userId)).toBe(0);
  bridge.db=b;await sync();await save('course',bridge.userId,courseInput.parse({title:'Titre corrigé',subjectId}),courseId);
  bridge.db=a;await completeReview(bridge.userId,courseId,'complete',randomUUID());await sync();
  bridge.db=b;await sync();expect((await find('course',courseId,bridge.userId))?.title).toBe('Titre corrigé');expect((await all('reviewPlan',bridge.userId))[0]?.currentStep).toBe(2);
  bridge.db=a;await sync();expect((await find('course',courseId,bridge.userId))?.title).toBe('Titre corrigé');expect(await all('reviewEvent',bridge.userId)).toHaveLength(2);
});
it('removes the losing optimistic event when two offline devices complete the same step',async()=>{
  const {courseId}=await seed();bridge.db=b;await sync();await completeReview(bridge.userId,courseId,'complete',randomUUID());bridge.db=a;await completeReview(bridge.userId,courseId,'complete',randomUUID());await sync();bridge.db=b;await sync();
  expect(await all('reviewEvent',bridge.userId)).toHaveLength(2);expect((await all('reviewPlan',bridge.userId))[0]?.currentStep).toBe(2);expect(await pendingCount(bridge.userId)).toBe(0);expect((await b.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM sync_conflicts'))?.n).toBe(1);
});
it('retains outbox on network failure and safely replays a response lost after server commit',async()=>{
  const subjectId=await save('subject',bridge.userId,subjectInput.parse({title:'Offline'}));const normal=bridge.send as (body:unknown)=>Promise<unknown>;
  bridge.send=async(body:unknown)=>{await normal(body);throw new Error('connection dropped');};await expect(sync()).rejects.toThrow();expect(await pendingCount(bridge.userId)).toBe(1);expect(await a.getFirstAsync('SELECT retry_count,last_error FROM sync_outbox WHERE owner_user_id=?',bridge.userId)).toEqual({retry_count:1,last_error:'network_or_server_error'});bridge.send=normal;await sync();expect(await pendingCount(bridge.userId)).toBe(0);expect(await server.subject.count({where:{id:subjectId}})).toBe(1);
});
