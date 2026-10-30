import {wrap,fail,response,requireRole} from '@/lib/http';
import {db} from '@/lib/db';
import {User,DailyTest,TestAttempt,QuestionProgress} from '@/lib/models';
export const GET=wrap(async(req)=>{
 const u=await requireRole(req,['mentor','admin']);if(!u)return fail('Forbidden',403);await db();
 const [learners,tests,attempts,pending,topicErrors]=await Promise.all([
  User.countDocuments({role:{$in:['learner','student']}}),DailyTest.countDocuments({status:'published'}),
  TestAttempt.countDocuments({status:'submitted'}),QuestionProgress.countDocuments({needsRevision:true}),
  QuestionProgress.aggregate([{$match:{needsRevision:true}},{$lookup:{from:DailyTest.collection.name,localField:'sourceTestId',foreignField:'_id',as:'test'}},
   {$unwind:'$test'},{$unwind:'$test.items'},{$match:{$expr:{$eq:['$test.items.questionId','$questionId']}}},
   {$group:{_id:{subject:'$test.items.snapshot.subject',topic:{$arrayElemAt:['$test.items.snapshot.topics',0]}},count:{$sum:1}}},{$sort:{count:-1}},{$limit:12}])]);
 return response({learners,tests,attempts,pending,topicErrors:topicErrors.map((x:any)=>({subject:x._id.subject,topic:x._id.topic,count:x.count}))});
});
