import {wrap,fail,response,requireRole} from '@/lib/http';
import {DailyTest,TestAttempt} from '@/lib/models';
import {db} from '@/lib/db';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);
 const month=new URL(req.url).searchParams.get('month')||'';
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return fail('month must be YYYY-MM');
 await db();const tests=await DailyTest.find({testDate:{$gte:month+'-01',$lte:month+'-31'},status:'published',batchId:{$in:['all',u.batchId]}}).select('title testDate releaseAt items').sort({testDate:1}).lean();
 const attempts=await TestAttempt.find({learnerId:u.id,testId:{$in:tests.map((t:any)=>t._id)}}).select('testId status').lean();
 const byTest=new Map(attempts.map((a:any)=>[String(a.testId),a.status]));
 return response({days:tests.map((t:any)=>({id:String(t._id),date:t.testDate,title:t.title,count:t.items.length,
 status:new Date(t.releaseAt)>new Date()?'scheduled':byTest.get(String(t._id))||'not_started'}))});
});
