import {wrap,fail,response,requireRole} from '@/lib/http';
import {DailyTest,TestAttempt,QuestionProgress} from '@/lib/models';
import {db} from '@/lib/db';
import {todayUK} from '@/lib/quiz';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);await db();
 const visible={$in:['all',u.batchId]};const today=todayUK();
 const [todayTests,totalCompleted,pending,totalIncorrect,submitted]=await Promise.all([
 DailyTest.find({testDate:today,status:'published',releaseAt:{$lte:new Date()},batchId:visible}).select('title testDate items').lean(),
 TestAttempt.countDocuments({learnerId:u.id,status:'submitted'}),
 QuestionProgress.countDocuments({learnerId:u.id,needsRevision:true}),
 QuestionProgress.countDocuments({learnerId:u.id,everIncorrect:true}),
 TestAttempt.find({learnerId:u.id,status:'submitted'}).select('correctCount answers').lean()
 ]);
 const totalQuestions=submitted.reduce((s:any,a:any)=>s+a.answers.length,0);
 const correct=submitted.reduce((s:any,a:any)=>s+a.correctCount,0);
 const ids=todayTests.map((t:any)=>t._id);
 const attempts=await TestAttempt.find({learnerId:u.id,testId:{$in:ids}}).select('testId status score').lean();
 const byTest=new Map(attempts.map((a:any)=>[String(a.testId),a]));
 return response({today,completedTests:totalCompleted,accuracy:totalQuestions?Math.round(correct/totalQuestions*100):0,
 needsRevision:pending,everIncorrect:totalIncorrect,totalAnswered:totalQuestions,
 todayTests:todayTests.map((t:any)=>({id:String(t._id),title:t.title,count:t.items.length,status:byTest.get(String(t._id))?.status||'not_started',score:byTest.get(String(t._id))?.score??null}))});
});
