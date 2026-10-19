import {wrap,fail,response,requireRole} from '@/lib/http';
import {db} from '@/lib/db';
import {QuestionProgress,TestAttempt,DailyTest} from '@/lib/models';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);await db();
 const attempts=await TestAttempt.find({learnerId:u.id,status:'submitted'}).select('testId answers correctCount score submittedAt').sort({submittedAt:-1}).lean();
 const tests=await DailyTest.find({_id:{$in:attempts.map((a:any)=>a.testId)}}).select('title items testDate').lean();
 const tMap=new Map(tests.map((t:any)=>[String(t._id),t]));
 const topics:Record<string,{subject:string,topic:string,correct:number,total:number}>={};
 for(const a of attempts as any[]){const t:any=tMap.get(String(a.testId));if(!t)continue;
 const m=new Map(a.answers.map((x:any)=>[String(x.questionId),x.isCorrect]));
 for(const item of t.items){const q=item.snapshot;const top=q.topics[0]||'general';const k=q.subject+'/'+top;
 if(!topics[k])topics[k]={subject:q.subject,topic:top,correct:0,total:0};topics[k].total++;if(m.get(String(item.questionId)))topics[k].correct++;
 }}
 const pending=await QuestionProgress.countDocuments({learnerId:u.id,needsRevision:true});
 return response({pending,attempts:attempts.map((a:any)=>({testId:String(a.testId),title:(tMap.get(String(a.testId)) as any)?.title||'Test',date:(tMap.get(String(a.testId)) as any)?.testDate,
 score:a.score,correctCount:a.correctCount,total:a.answers.length})),topics:Object.values(topics)});
});
