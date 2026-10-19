import {wrap,fail,response,requireRole} from '@/lib/http';
import {revisionSchema} from '@/lib/validators';
import {QuestionProgress,DailyTest,RevisionAttempt} from '@/lib/models';
import {db} from '@/lib/db';
import {mark} from '@/lib/quiz';
export const POST=wrap(async(req)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);await db();
 const v=revisionSchema.parse(await req.json());
 const p=await QuestionProgress.findOne({learnerId:u.id,questionId:v.questionId,everIncorrect:true});
 if(!p)return fail('Question is not in your revision history',404);
 const test=await DailyTest.findById(p.sourceTestId);if(!test)return fail('Source test not found',404);
 const item=test.items.find((x:any)=>String(x.questionId)===v.questionId);
 if(!item)return fail('Question not found',404);
 if(new Set(v.selectedOptionKeys).size!==v.selectedOptionKeys.length||v.selectedOptionKeys.some(k=>!item.snapshot.options.some((o:any)=>o.key===k)))return fail('Invalid selected options',422);
 const isCorrect=v.selectedOptionKeys.length>0&&mark(item.snapshot,v.selectedOptionKeys);
 await RevisionAttempt.create({learnerId:u.id,questionId:v.questionId,sourceTestId:p.sourceTestId,selectedOptionKeys:v.selectedOptionKeys,isCorrect});
 p.needsRevision=!isCorrect;p.lastCorrect=isCorrect;p.lastAttemptAt=new Date();p.revisionCount+=1;await p.save();
 return response({isCorrect,correctOptionKeys:item.snapshot.correctOptionKeys,explanation:item.snapshot.explanation,needsRevision:p.needsRevision});
});
