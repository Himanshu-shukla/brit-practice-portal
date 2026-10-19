import {wrap,fail,response,requireRole} from '@/lib/http';
import {answersSchema} from '@/lib/validators';
import {getTestForAttempt,validateAnswers} from '@/lib/attempts';
import {TestAttempt} from '@/lib/models';
export const POST=wrap(async(req,ctx)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);
 const {id}=await ctx.params;const test=await getTestForAttempt(id,u);if(!test)return fail('Test unavailable',404);
 const input=answersSchema.parse(await req.json());if(!validateAnswers(test,input.answers))return fail('Invalid questions or option keys',422);
 const record={learnerId:u.id,testId:id};
 const previous=await TestAttempt.findOne(record);if(previous?.status==='submitted')return fail('Test already submitted',409);
 const updates=input.answers.map(a=>({questionId:a.questionId,selectedOptionKeys:a.selectedOptionKeys}));
 try {await TestAttempt.updateOne({...record,status:'in_progress'},{$set:{answers:updates},$setOnInsert:{status:'in_progress'}},{upsert:!previous});}
 catch(e:any){if(e.code===11000)return fail('Please reload your current attempt',409);throw e;}
 return response({saved:true});
});
