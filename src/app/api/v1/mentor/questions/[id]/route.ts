import {wrap,fail,response,requireRole,idOK} from '@/lib/http';
import {questionSchema} from '@/lib/validators';
import {Question} from '@/lib/models';
import {db} from '@/lib/db';
import {ensureMedia} from '@/lib/quiz';
export const GET=wrap(async(req,ctx)=>{const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);
 const {id}=await ctx.params;if(!idOK(id))return fail('Invalid ID');await db();const q=await Question.findById(id).lean();return q?response({question:q}):fail('Not found',404);});
export const PATCH=wrap(async(req,ctx)=>{
 const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);
 const {id}=await ctx.params;if(!idOK(id))return fail('Invalid ID');const data=questionSchema.parse(await req.json());
 try{await ensureMedia([...new Set([...data.mediaIds,...data.options.map(o=>o.mediaId).filter(Boolean) as string[]])]);}catch{return fail('Invalid media IDs',422);}
 await db();const current=await Question.findById(id);if(!current)return fail('Not found',404);
 const {externalId,...update}=data; // Existing external ID is immutable for idempotent imports.
 Object.assign(current,update);current.version+=1;await current.save();return response({id,version:current.version});
});
