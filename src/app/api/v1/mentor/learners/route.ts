import {z} from 'zod';import bcrypt from 'bcryptjs';
import {wrap,fail,response,requireRole,pageQuery} from '@/lib/http';
import {db} from '@/lib/db';import {User} from '@/lib/models';
export const GET=wrap(async(req)=>{
 const actor=await requireRole(req,['mentor','admin']);if(!actor)return fail('Forbidden',403);await db();
 const {page,size,skip,params}=pageQuery(req);const filter:any={role:'learner'};if(params.get('batchId'))filter.batchId=params.get('batchId');
 const [users,total]=await Promise.all([User.find(filter).select('name email batchId createdAt').sort({createdAt:-1}).skip(skip).limit(size).lean(),User.countDocuments(filter)]);
 return response({items:users.map((u:any)=>({id:String(u._id),name:u.name,email:u.email,batchId:u.batchId})),total,page,pageSize:size});
});
export const POST=wrap(async(req)=>{
 const actor=await requireRole(req,['mentor','admin']);if(!actor)return fail('Forbidden',403);
 const input=z.object({name:z.string().trim().min(2).max(100),email:z.string().email(),password:z.string().min(10).max(200),batchId:z.string().min(1).max(80)}).parse(await req.json());
 await db();const passwordHash=await bcrypt.hash(input.password,12);
 const u=await User.create({...input,email:input.email.toLowerCase(),passwordHash,password:undefined,role:'learner'});
 return response({id:String(u._id),message:'Learner created; share the initial password securely'},201);
});
