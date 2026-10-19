import {NextRequest,NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {db} from '@/lib/db';
import {User} from '@/lib/models';
import {wrap,fail} from '@/lib/http';
import {newToken,cookieName} from '@/lib/auth';
export const runtime='nodejs';
export const POST=wrap(async(req:NextRequest)=>{
 const {email,password}=z.object({email:z.string().email(),password:z.string().min(1)}).parse(await req.json());
 await db();const user=await User.findOne({email:email.toLowerCase().trim()});
 if(!user)return fail('Invalid email or password',401);
 if(user.lockedUntil&&user.lockedUntil>new Date())return fail('Account temporarily locked. Try later.',429);
 const valid=await bcrypt.compare(password,user.passwordHash);
 if(!valid){user.failedLogins+=1;if(user.failedLogins>=5){user.lockedUntil=new Date(Date.now()+15*60*1000);user.failedLogins=0;}await user.save();return fail('Invalid email or password',401);}
 user.failedLogins=0;user.lockedUntil=undefined;await user.save();
 const token=await newToken(String(user._id));const r=NextResponse.json({name:user.name,role:user.role});
 r.cookies.set(cookieName(),token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*24*60*60});return r;
});
