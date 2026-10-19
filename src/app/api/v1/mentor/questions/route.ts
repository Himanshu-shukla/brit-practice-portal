import {wrap,fail,response,requireRole,pageQuery} from '@/lib/http';
import {questionSchema} from '@/lib/validators';
import {Question} from '@/lib/models';
import {db} from '@/lib/db';
import {ensureMedia} from '@/lib/quiz';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);await db();
 const {page,size,skip,params}=pageQuery(req);const filter:any={};
 if(params.get('subject'))filter.subject=params.get('subject');if(params.get('topic'))filter.topics=params.get('topic');
 if(params.get('status'))filter.status=params.get('status');
 const [questions,total]=await Promise.all([Question.find(filter).sort({createdAt:-1}).skip(skip).limit(size).lean(),Question.countDocuments(filter)]);
 return response({items:questions.map((q:any)=>({...q,id:String(q._id)})),total,page,pageSize:size});
});
export const POST=wrap(async(req)=>{
 const u=await requireRole(req,['mentor','admin','integration']);if(!u)return fail('Forbidden',403);
 const data=questionSchema.parse(await req.json());await db();
 const media=[...data.mediaIds,...data.options.map(o=>o.mediaId).filter(Boolean) as string[]];
 try{await ensureMedia([...new Set(media)]);}catch{return fail('Invalid media IDs',422);}
 const q=await Question.create({...data,createdBy:u.id});return response({id:String(q._id),message:'Question created'},201);
});
