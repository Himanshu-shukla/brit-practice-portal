import {z} from 'zod';
import {wrap,fail,response,requireRole} from '@/lib/http';
import {questionSchema} from '@/lib/validators';
import {Question} from '@/lib/models';
import {db} from '@/lib/db';
import {ensureMedia} from '@/lib/quiz';
export const POST=wrap(async(req)=>{
 const u=await requireRole(req,['mentor','admin','integration']);if(!u)return fail('Forbidden',403);
 const input=z.array(questionSchema).min(1).max(200).parse(await req.json());await db();
 const all=[...new Set(input.flatMap(q=>[...q.mediaIds,...q.options.map(o=>o.mediaId).filter(Boolean) as string[]]))];
 try{await ensureMedia(all);}catch{return fail('Invalid media IDs',422);}
 const result:any[]=[];
 for(let i=0;i<input.length;i++){
  const q=input[i];try{
   if(q.externalId){const d=await Question.findOneAndUpdate({externalId:q.externalId},{$setOnInsert:{...q,createdBy:u.id}},{upsert:true,new:true});
    result.push({index:i,id:String(d._id),externalId:q.externalId});}
   else{const d=await Question.create({...q,createdBy:u.id});result.push({index:i,id:String(d._id)});}
  }catch(e:any){result.push({index:i,error:e?.code===11000?'Duplicate externalId':'Could not create question'});}
 }
 return response({imported:result.filter(r=>!r.error).length,failed:result.filter(r=>r.error).length,results:result});
});
