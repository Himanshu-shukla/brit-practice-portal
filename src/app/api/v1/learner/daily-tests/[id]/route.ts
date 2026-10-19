import {wrap,fail,response,requireRole,canViewTest,idOK} from '@/lib/http';
import {DailyTest,TestAttempt} from '@/lib/models';
import {db} from '@/lib/db';
import {publicQuestion} from '@/lib/quiz';
export const GET=wrap(async(req,ctx)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);
 const {id}=await ctx.params;if(!idOK(id))return fail('Invalid test ID');await db();
 const t=await DailyTest.findById(id).lean() as any;if(!t||!canViewTest(t,u))return fail('Test unavailable',404);
 const a=await TestAttempt.findOne({learnerId:u.id,testId:id}).lean() as any;
 const submitted=a?.status==='submitted';
 return response({test:{id,title:t.title,date:t.testDate,questions:t.items.map((item:any)=>{
  const q=publicQuestion(item);return submitted?{...q,correctOptionKeys:item.snapshot.correctOptionKeys,explanation:item.snapshot.explanation}:q;
 })},attempt:a?{status:a.status,answers:a.answers.map((x:any)=>({questionId:String(x.questionId),selectedOptionKeys:x.selectedOptionKeys,...(submitted?{isCorrect:x.isCorrect}:{})})),...(submitted?{score:a.score,correctCount:a.correctCount}:{} )}:null});
});
