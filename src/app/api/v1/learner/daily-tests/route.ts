import {wrap,fail,response,requireRole} from '@/lib/http';
import {DailyTest,TestAttempt} from '@/lib/models';
import {db} from '@/lib/db';
import {validDate} from '@/lib/quiz';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);
 const date=new URL(req.url).searchParams.get('date')||'';if(!validDate(date))return fail('Invalid date');await db();
 const ts=await DailyTest.find({testDate:date,status:'published',batchId:{$in:['all',u.batchId]}}).select('title testDate releaseAt items').lean();
 const as=await TestAttempt.find({learnerId:u.id,testId:{$in:ts.map((x:any)=>x._id)}}).select('testId status score').lean();
 const m=new Map(as.map((a:any)=>[String(a.testId),a]));
 return response({tests:ts.map((t:any)=>({id:String(t._id),title:t.title,testDate:t.testDate,count:t.items.length,
 status:t.releaseAt>new Date()?'scheduled':m.get(String(t._id))?.status||'not_started',score:m.get(String(t._id))?.score??null}))});
});
