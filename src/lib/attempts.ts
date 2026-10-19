import { db } from './db';
import {DailyTest,TestAttempt,QuestionProgress} from './models';
import {canViewTest,idOK,fail} from './http';
import {mark} from './quiz';
import type {Actor} from './auth';
export async function getTestForAttempt(id:string,u:Actor){
 if(!idOK(id))return null;await db();const test=await DailyTest.findById(id);
 if(!test||!canViewTest(test,u))return null;return test;
}
export function validateAnswers(test:any,arr:{questionId:string,selectedOptionKeys:string[]}[]){
 const lookup=new Map(test.items.map((it:any)=>[String(it.questionId),it.snapshot]));
 if(new Set(arr.map(x=>x.questionId)).size!==arr.length)return false;
 return arr.every(a=>{const snap:any=lookup.get(a.questionId);
  return snap && new Set(a.selectedOptionKeys).size===a.selectedOptionKeys.length && a.selectedOptionKeys.every(k=>snap.options.some((o:any)=>o.key===k));});
}
export async function syncProgress(test:any,attempt:any,u:Actor){
 const qs=new Map(test.items.map((it:any)=>[String(it.questionId),it]));
 // Daily results establish the baseline. Existing successful revisions remain resolved.
 for(const answer of attempt.answers){
  const id=String(answer.questionId);if(!qs.has(id))continue;
  const old=await QuestionProgress.findOne({learnerId:u.id,questionId:id});
  if(old?.lastAttemptAt && attempt.submittedAt && old.lastAttemptAt > attempt.submittedAt)continue; // Later revision/test already changed this question.
  if(!answer.isCorrect){await QuestionProgress.updateOne({learnerId:u.id,questionId:id},
    {$set:{needsRevision:true,everIncorrect:true,lastCorrect:false,lastAttemptAt:new Date(),sourceTestId:test._id},$setOnInsert:{revisionCount:0}},{upsert:true});}
 }
}
