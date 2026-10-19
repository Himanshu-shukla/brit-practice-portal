import {wrap,fail,response,requireRole,pageQuery} from '@/lib/http';
import {DailyTest,QuestionProgress} from '@/lib/models';
import {db} from '@/lib/db';
import {publicQuestion} from '@/lib/quiz';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['learner','mentor','admin']);if(!u)return fail('Unauthorized',401);await db();
 const {page,size,skip,params}=pageQuery(req);const subject=params.get('subject'),topic=params.get('topic'),difficulty=params.get('difficulty'),status=params.get('status');
 const match:any={'status':'published',releaseAt:{$lte:new Date()},batchId:{$in:['all',u.batchId]}};
 const itemMatch:any={};if(subject)itemMatch['items.snapshot.subject']=subject;
 if(topic)itemMatch['items.snapshot.topics']=topic;if(difficulty)itemMatch['items.snapshot.difficulty']=difficulty;
 if(status==='incorrect'){
  const ids=await QuestionProgress.find({learnerId:u.id,needsRevision:true}).distinct('questionId');itemMatch['items.questionId']={$in:ids};
 }
 const pipeline:any[]=[{$match:match},{$unwind:'$items'},{$match:itemMatch},{$sort:{releaseAt:-1,_id:-1}},
  {$group:{_id:'$items.questionId',entry:{$first:'$items'},testId:{$first:'$_id'},testDate:{$first:'$testDate'},releaseAt:{$first:'$releaseAt'}}},
  {$sort:{releaseAt:-1,_id:-1}},{$facet:{data:[{$skip:skip},{$limit:size}],count:[{$count:'total'}]}}];
 const [out]=await DailyTest.aggregate(pipeline);
 return response({items:out.data.map((x:any)=>({...publicQuestion(x.entry),testId:String(x.testId),date:x.testDate})),
 total:out.count[0]?.total||0,page,pageSize:size});
});
