import { DateTime } from 'luxon';
import { Types } from 'mongoose';
import { Question,Media } from './models';
import { db } from './db';
export function validDate(s:string){const x=DateTime.fromISO(s,{zone:'Europe/London'});return x.isValid&&x.toFormat('yyyy-MM-dd')===s;}
export function releaseDate(s:string){return DateTime.fromISO(s,{zone:'Europe/London'}).startOf('day').toUTC().toJSDate();}
export function todayUK(){return DateTime.now().setZone('Europe/London').toFormat('yyyy-MM-dd');}
export function objectId(s:string){return new Types.ObjectId(s);}
export function cleanQuestion(q:any){const v=typeof q.toObject==='function'?q.toObject():q;const {_id,id,type,subject,topics,tags,difficulty,questionText,mediaIds,options,explanation}=v;
 return {id:String(_id||id),type,subject,topics,tags,difficulty,questionText,mediaIds,options:options.map((o:any)=>({key:o.key,text:o.text,mediaId:o.mediaId})),explanation:undefined};}
export function publicQuestion(item:any){const s=item.snapshot;return {...cleanQuestion({...s,id:item.questionId}),id:String(item.questionId)};}
export function mark(snapshot:any,keys:string[]){const sorted=(x:string[])=>[...x].sort().join('|');return sorted(snapshot.correctOptionKeys)===sorted(keys);}
export async function ensureMedia(ids:string[]){if(!ids.length)return;
 if(ids.some(id=>!Types.ObjectId.isValid(id)))throw new Error('Invalid media ID');
 await db();const n=await Media.countDocuments({_id:{$in:ids}});if(n!==new Set(ids).size)throw new Error('One or more media IDs do not exist');}
export async function snapshotQuestions(ids:string[]){await db();if(ids.some(id=>!Types.ObjectId.isValid(id)))return null;
 const qs=await Question.find({_id:{$in:ids},status:'published'}).lean() as any[];
 if(qs.length!==new Set(ids).size)return null;
 const map=new Map(qs.map(q=>[String(q._id),q]));
 return ids.map(id=>{const q=map.get(id);return {questionId:q._id,snapshot:{type:q.type,subject:q.subject,topics:q.topics,tags:q.tags,
 difficulty:q.difficulty,questionText:q.questionText,mediaIds:q.mediaIds,options:q.options.map((o:any)=>({key:o.key,text:o.text,mediaId:o.mediaId})),
 correctOptionKeys:q.correctOptionKeys,explanation:q.explanation,version:q.version}};});
}
