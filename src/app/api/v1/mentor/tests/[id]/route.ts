import {wrap,fail,response,requireRole,idOK} from '@/lib/http';
import {DailyTest,TestAttempt} from '@/lib/models';
import {snapshotQuestions,releaseDate,validDate} from '@/lib/quiz';
import {db} from '@/lib/db';
import {z} from 'zod';
const update=z.object({
  status:z.enum(['draft','published','archived']).optional(),
  title:z.string().min(4).max(160).optional(),
  testDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  batchId:z.string().min(1).max(80).optional(),
  questionIds:z.array(z.string()).min(1).max(100).optional()
}).refine(x=>Object.keys(x).length>0,'At least one change required');
export const GET=wrap(async(req,ctx)=>{
 const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);
 const {id}=await ctx.params;if(!idOK(id))return fail('Invalid ID');await db();
 const t=await DailyTest.findById(id).lean() as any;if(!t)return fail('Not found',404);
 return response({test:{id:String(t._id),title:t.title,testDate:t.testDate,batchId:t.batchId,status:t.status,
  questionIds:t.items.map((it:any)=>String(it.questionId))}});
});
export const PATCH=wrap(async(req,ctx)=>{
 const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);
 const {id}=await ctx.params;if(!idOK(id))return fail('Invalid ID');
 const patch=update.parse(await req.json());if(patch.testDate&&!validDate(patch.testDate))return fail('Invalid date',422);
 if(patch.questionIds&&new Set(patch.questionIds).size!==patch.questionIds.length)return fail('Duplicate question IDs',422);
 await db();const t=await DailyTest.findById(id);if(!t)return fail('Not found',404);
 const attempts=await TestAttempt.countDocuments({testId:id});
 if(attempts>0&&(patch.title!==undefined||patch.testDate!==undefined||patch.batchId!==undefined||patch.questionIds!==undefined||
 (patch.status!==undefined&&patch.status!=='published')))return fail('Tests with learner attempts cannot be changed/unpublished',409);
 if(patch.questionIds){const items=await snapshotQuestions(patch.questionIds);if(!items)return fail('All selected questions must be published',422);t.items=items;}
 if(patch.title!==undefined)t.title=patch.title;
 if(patch.batchId!==undefined)t.batchId=patch.batchId;
 if(patch.testDate!==undefined){t.testDate=patch.testDate;t.releaseAt=releaseDate(patch.testDate);}
 if(patch.status!==undefined)t.status=patch.status;
 await t.save();return response({id:String(t._id),status:t.status});
});
