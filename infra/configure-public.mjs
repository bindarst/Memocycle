import {writeFile} from 'node:fs/promises';
const {GOOGLE_WEB_CLIENT_ID,EXPO_PUBLIC_API_URL,SUPPORT_EMAIL}=process.env;
if(!GOOGLE_WEB_CLIENT_ID?.endsWith('.apps.googleusercontent.com')||!EXPO_PUBLIC_API_URL?.startsWith('https://')||!SUPPORT_EMAIL?.includes('@'))throw new Error('GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_API_URL and SUPPORT_EMAIL are required');
await writeFile(new URL('./public/config.js',import.meta.url),`globalThis.MEMOCYCLE_PUBLIC_CONFIG = ${JSON.stringify({googleWebClientId:GOOGLE_WEB_CLIENT_ID,apiUrl:EXPO_PUBLIC_API_URL,supportEmail:SUPPORT_EMAIL})};\n`);
