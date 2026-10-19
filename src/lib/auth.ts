import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { User } from './models';
import { db } from './db';
import { createHash, timingSafeEqual } from 'crypto';

const COOKIE='brit_session';
function key() {const s=process.env.JWT_SECRET||'';if(s.length<32)throw new Error('JWT_SECRET must be 32+ characters');return new TextEncoder().encode(s);}
export type Actor={id:string,name:string,email:string,role:'learner'|'mentor'|'admin',batchId:string};
export async function newToken(id:string){return new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject(id).setIssuedAt().setExpirationTime('7d').sign(key());}
export async function actor():Promise<Actor|null>{
 try {const jwt=(await cookies()).get(COOKIE)?.value;if(!jwt)return null;
  const {payload}=await jwtVerify(jwt,key());if(!payload.sub)return null;
  await db();const u=await User.findById(payload.sub).lean() as any;
  if(!u)return null;return {id:String(u._id),name:u.name,email:u.email,role:u.role,batchId:u.batchId};
 }catch{return null;}
}
export function cookieName(){return COOKIE;}
export function checkOrigin(req:NextRequest){
 const origin=req.headers.get('origin');
 if(!origin)return true; // Non-browser machine clients may omit it; bearer key used for integrations.
 const configured=process.env.APP_ORIGIN;
 if(!configured)return false;
 try{
   const o=new URL(origin);
   const c=new URL(configured);
   if(o.origin===c.origin)return true;
   if(process.env.NODE_ENV!=='production'&&(o.hostname==='localhost'||o.hostname==='127.0.0.1')&&(c.hostname==='localhost'||c.hostname==='127.0.0.1'))return true;
   return false;
 }catch{return false;}
}
export function validIntegrationKey(req:NextRequest){
 const expected=process.env.INTEGRATION_API_KEY;
 const provided=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
 if(!expected||!provided||expected.length<32)return false;
 const a=createHash('sha256').update(expected).digest();const b=createHash('sha256').update(provided).digest();
 return timingSafeEqual(a,b);
}
