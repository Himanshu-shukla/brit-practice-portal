import { NextRequest,NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { actor,checkOrigin,validIntegrationKey,normalizeRole,type Actor } from './auth';
export function fail(message:string,status=400){return NextResponse.json({error:message},{status});}
export function response(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function idOK(s:string){return Types.ObjectId.isValid(s) && String(new Types.ObjectId(s))===s.toLowerCase();}
export function wrap(f:(req:NextRequest,ctx:any)=>Promise<Response>){
 return async(req:NextRequest,ctx:any)=>{
  try {if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!checkOrigin(req))return fail('Invalid origin',403);return await f(req,ctx);}
  catch(e:any){console.error('API error',e);if(e?.name==='ZodError')return fail(e.issues?.map((x:any)=>`${x.path.join('.')}: ${x.message}`).join('; ')||'Invalid input',422);
   if(e?.code===11000)return fail('Duplicate record or external ID',409);
   return fail('Internal server error',500);}
 };
}
export async function requireRole(rolesOrReq:NextRequest|Array<Actor['role']|'integration'>,maybeRoles?:Array<Actor['role']|'integration'>):Promise<Actor|null>{
 const req=rolesOrReq instanceof NextRequest ? rolesOrReq : null;
 const roles=(Array.isArray(rolesOrReq)?rolesOrReq:maybeRoles)||['learner','mentor','admin'];
 if(req&&roles.includes('integration' as any)&&validIntegrationKey(req)){
  const email=process.env.INTEGRATION_MENTOR_EMAIL; if(!email)return null;
  const {db}=await import('./db');const {User}=await import('./models');await db();
  const m=await User.findOne({email:email.toLowerCase(),role:{$in:['mentor','admin','teacher','superadmin']}}).lean() as any;
  if(!m||m.isActive===false)return null;return {id:String(m._id),name:m.name,email:m.email||m.username||'',username:m.username,role:normalizeRole(m.role),batchId:m.batchId||'all'};
 }
 const a=await actor();if(!a||!roles.includes(a.role as any))return null;return a;
}
export function canViewTest(test:any,user:Actor){
 if(user.role==='mentor'||user.role==='admin')return true;
 return test.status==='published'&&new Date(test.releaseAt).getTime()<=Date.now()&&(!test.batchId||test.batchId==='all'||test.batchId===user.batchId);
}
export function pageQuery(req:NextRequest){const u=new URL(req.url);const page=Math.max(1,Math.min(10000,parseInt(u.searchParams.get('page')||'1')||1));const size=Math.max(1,Math.min(50,parseInt(u.searchParams.get('pageSize')||'10')||10));return {page,size,skip:(page-1)*size,params:u.searchParams};}
