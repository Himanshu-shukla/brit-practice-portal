import {wrap,fail,response,requireRole} from '@/lib/http';
import {answersSchema} from '@/lib/validators';
import {getTestForAttempt,validateAnswers,syncProgress} from '@/lib/attempts';
import {TestAttempt} from '@/lib/models';
import {mark} from '@/lib/quiz';
export const POST=wrap(async(req,ctx)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);
 const {id}=await ctx.params;const test=await getTestForAttempt(id,u);if(!test)return fail('Test unavailable',404);
 const input=answersSchema.parse(await req.json());
 if(!validateAnswers(test,input.answers))return fail('Invalid question IDs or options',422);
 const lookup=new Map(input.answers.map(a=>[a.questionId,a.selectedOptionKeys]));
 const answers=test.items.map((it:any)=>{const keys=lookup.get(String(it.questionId))||[];
 return {questionId:it.questionId,selectedOptionKeys:keys,isCorrect:keys.length>0&&mark(it.snapshot,keys)};});
 const correctCount=answers.filter((a:any)=>a.isCorrect).length;
 const score=Math.round(100*correctCount/(answers.length||1));
 const condition={learnerId:u.id,testId:id,status:'in_progress'};
 let existing=await TestAttempt.findOne({learnerId:u.id,testId:id});
 if(!existing){try{existing=await TestAttempt.create({learnerId:u.id,testId:id,status:'in_progress'});}catch(e:any){if(e.code!==11000)throw e;}}
 const result=await TestAttempt.findOneAndUpdate(condition,{$set:{status:'submitted',answers,correctCount,score,submittedAt:new Date()}},{new:true});
 if(!result){const previous=await TestAttempt.findOne({learnerId:u.id,testId:id});
  if(previous?.status==='submitted'){await syncProgress(test,previous,u);return response({score:previous.score,correctCount:previous.correctCount,total:answers.length,alreadySubmitted:true});}
  return fail('Could not finalize the test; retry',409);
 }
 await syncProgress(test,result,u);
 return response({score,correctCount,total:answers.length});
});
