import {wrap,fail,response,requireRole,pageQuery} from '@/lib/http';
import {dailyTestSchema} from '@/lib/validators';
import {DailyTest} from '@/lib/models';
import {db} from '@/lib/db';
import {snapshotQuestions,releaseDate,validDate} from '@/lib/quiz';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);await db();
 const {page,size,skip}=pageQuery(req);const [ts,total]=await Promise.all([DailyTest.find().sort({testDate:-1,createdAt:-1}).skip(skip).limit(size).select('title testDate batchId status items releaseAt').lean(),DailyTest.countDocuments()]);
 return response({items:ts.map((t:any)=>({id:String(t._id),title:t.title,date:t.testDate,batchId:t.batchId,status:t.status,count:t.items.length,releaseAt:t.releaseAt})),total,page,pageSize:size});
});
export const POST=wrap(async(req)=>{
 const u=await requireRole(req,['mentor','admin','integration']);if(!u)return fail('Forbidden',403);
 const input=dailyTestSchema.parse(await req.json());if(!validDate(input.testDate))return fail('Invalid date');
 if(new Set(input.questionIds).size!==input.questionIds.length)return fail('Duplicate question IDs',422);
 const items=await snapshotQuestions(input.questionIds);if(!items)return fail('All questions must exist and be published',422);
 const t=await DailyTest.create({title:input.title,testDate:input.testDate,batchId:input.batchId,
  status:input.status,items,createdBy:u.id,releaseAt:releaseDate(input.testDate)});
 return response({id:String(t._id),message:'Daily test created'},201);
});
