import {NextResponse} from 'next/server';
import {wrap} from '@/lib/http';
import {cookieName} from '@/lib/auth';
export const POST=wrap(async()=>{const r=NextResponse.json({ok:true});r.cookies.set(cookieName(),'',{path:'/',httpOnly:true,maxAge:0});return r;});
